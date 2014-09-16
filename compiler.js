var fs = require('fs');
var path = require('path');
var lexer = require('./lexer.js');
var parser = require('./parser.js');
var errors = require('./errors.js');
var defspiller = require('./spiller.js');
var escodegen = require('escodegen');

// 'modulePath' is either a relative or absolute filename of a gismo file (ending with *.gs)
// or the path of a directory of a package, which contains a file called 'package.json'.
function Compiler(modulePath) {
	this.path = modulePath;
	this.spillers = {
		"default" : new defspiller.NodeJSSpiller(this)
	};

	// Is it a file or a single module?
	try {
		this.isFile = fs.statSync(modulePath).isFile();
	} catch(err) {
		throw new errors.SyntaxError("Unknown module " + this.path);
	}

	// Read package information if available
	if (this.isFile) {
		if (path.extname(this.path) != ".gs") {
			throw new errors.SyntaxError("Not a gismo file " + this.path);
		}
		this.pkg = {};
	} else {
		if (this.path === "") {
			throw new errors.SyntaxError("Illegal path for a module: " + this.path);
		}
		if (this.path[this.path.length - 1] != path.sep) {
			this.path += path.sep;
		}
		// Try to read the package.json
		try {
			this.pkg = JSON.parse(fs.readFileSync(this.path + 'package.json', 'utf8'));
		} catch(err) {
			throw new errors.SyntaxError("Unknown module " + this.path);
		}
	}

	this.imports = { };
}

/// Sets the spiller that is used by the compiler to generate output.
Compiler.prototype.addSpiller = function(name, spiller) {
	this.spillers[name] = spiller;
};

/// Returns the spiller used by the compiler to generate output.
Compiler.prototype.getSpiller = function(name) {
	return this.spillers[name];
};

// Called from the parser that is launched on behalf of compileModule().
Compiler.prototype.importMetaModule = function(parser, modulePath, alias) {
	if (modulePath === "") {
		throw new Error("Implementation Error: Illegal path for a module.");
	}
	if (modulePath[modulePath.length - 1] != path.sep) {
		modulePath += path.sep;
	}
	// Try to read the package.json
	var pkg;
	try {
		if (modulePath === this.path) {
			pkg = this.pkg;
		} else {
			pkg = JSON.parse(fs.readFileSync(modulePath + 'package.json', 'utf8'));
		}
	} catch(err) {
		pkg = { };
	}

	// No gismo section? -> a normal node module
	if (!pkg.gismo || typeof pkg.gismo !== "object") {
		// Return an empty module
		return;
	}
	// Which file contains the meta code?
	var metafile = path.resolve(path.join(modulePath, "_meta.js"));
	if (!fs.existsSync(metafile)) {
		throw new Error("The module '" + modulePath + "' has not yet been compiled");
	}

	this.imports[metafile] = {module: m, alias: alias};

	var m;
	try {
		m = require(metafile);
//		console.log("extend " + this.path + " with " + modulePath + " importModuleName == " + parser.importModuleName);
		parser.importModuleName = modulePath;
		m.extendParser(parser);
	} catch(err) {
		if (err instanceof errors.SyntaxError || err instanceof errors.CompilerError) {
			throw err;
		}
		var e = new errors.CompilerError(err.toString());
		e.stack = err.stack;
		throw e;
	}
};

/// Returns the variable name that stores a reference to module 'm' in the generated source code.
/// Returns null if this module has not yet been imported by the compiled source code.
Compiler.prototype.importAlias = function(m) {
	var m = this.imports[m.filename];
	if (!m) {
		return null;
	}
	return m.alias;
};

// Compiles the module, including its meta module
Compiler.prototype.compileModule = function() {
	var srcfiles = [];

	if (this.isFile) {
		srcfiles = [this.path];
	} else {
		// If it is a normal node package, do nothing
		if (!this.pkg.gismo || typeof this.pkg.gismo !== "object") {
			return;
		}

		this.compileMetaModule();

		srcfiles = this.pkg.gismo.src;
		if (!srcfiles || typeof srcfiles !== "object") {
			try {
				srcfiles = fs.readdirSync(this.path + "src").sort();
			} catch(e) {
				srcfiles = [];
			}
		}
		for(var i = 0; i < srcfiles.length; i++) {
			var fname = srcfiles[i];
			if (fname[0] === '.' || fname.length < 4 || fname.substr(fname.length - 3, 3) !== ".gs") {
				continue;
			}
			srcfiles[i] = path.join(this.path, "src", fname);
		}
	}

	var program = {type: "Program", body: []};

	// Parse and compile all files
	for(var i = 0; i < srcfiles.length; i++) {
		var fname = srcfiles[i];
		var str;
		try {
			str = fs.readFileSync(fname).toString();
		} catch(err) {
			throw new Error("Could not read '" + fname + "'");
		}
		var p = new parser.Parser(this);
//		p.importModuleName = this.path;
		this.importMetaModule(p, this.path, "module");
		var body = p.parse(lexer.newTokenizer(str, fname));
		try {
			// Add the file to all spillers
			for(var key in this.spillers) {
				if (body.spillers && body.spillers[key]) {
					body.spillers[key].spill(fname, body);
				} else {
					this.spillers[key].addFile(fname, body);
				}
			}
		} catch(err) {
			if (err instanceof errors.SyntaxError || err instanceof errors.CompilerError) {
				throw err;
			}
			var e = new errors.CompilerError(err.toString());
			e.stack = err.stack;
			throw e;
		}			
	}

	try {
		for(var key in this.spillers) {
			this.spillers[key].spill();
		}
	} catch(err) {
		if (err instanceof errors.SyntaxError || err instanceof errors.CompilerError) {
			throw err;
		}
		var e = new errors.CompilerError(err.toString());
		e.stack = err.stack;
		throw e;
	}
};

// Compiles the meta module
Compiler.prototype.compileMetaModule = function() {
	// If it is a normal node package, do nothing
	if (!this.pkg.gismo || typeof this.pkg.gismo !== "object") {
		return;
	}

	var srcfiles = this.pkg.gismo.compiler;
	if (!srcfiles || typeof srcfiles !== "object") {
		try {
			srcfiles = fs.readdirSync(this.path + "compiler").sort();
		} catch(err) {
			srcfiles = [];
		}
	}

	var program = {type: "Program", body: []};

	// Parse and compile all files
	for(var i = 0; i < srcfiles.length; i++) {
		var fname = srcfiles[i];
		if (fname[0] === '.' || fname.length < 4 || fname.substr(fname.length - 3, 3) !== ".gs") {
			continue;
		}
		var str;
		try {
			str = fs.readFileSync(this.path + "compiler/" + fname).toString();
		} catch(err) {
			throw new Error("Could not read '" + this.path + "compiler/" + fname + "'");
		}
		var p = new parser.Parser(this);
		program.body = program.body.concat(p.parse(lexer.newTokenizer(str, this.path + "compiler/" + fname)));
	}

	var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: true, sourceContent: this.metaFile()});
//	console.log(JSON.stringify(result.code));
	var code = "exports.extendParser = function(parser) { "+ result.code + "\n}\n//# sourceMappingURL=_meta.js.map";
	fs.writeFileSync(this.metaFile(), code);
	fs.writeFileSync(this.metaFile() + '.map', result.map.toString());
};

Compiler.prototype.mainFile = function() {
	var main;
	if (this.isFile) {
		var dir = path.dirname(this.path);
		var base = path.basename(this.path);
		main = path.join(dir, "." + base.slice(0, base.length - 3) + ".js");
	} else {
		main = path.join(this.path, this.pkg.main ? this.pkg.main : "index.js");
	}
	main = path.resolve(main);
	return main;
};

Compiler.prototype.metaFile = function() {
	if (this.isFile) {
		return null;
	}
	// Which file contains the metailed import?
	var metafile = this.pkg.gismo.metafile;
	if (typeof metafile !== "string" || metafile === "") {
		metafile = path.join(this.path, "_meta.js");
	}
	return metafile;
};

Compiler.prototype.isUpToDate = function() {
	if (this.isFile) {
		try {
			var mtime = fs.statSync(this.path).mtime.getTime();
			var mtime2 = fs.statSync(this.mainFile()).mtime.getTime();
		} catch(err) {
			return false;
		}
		return mtime <= mtime2;
	}

	// If it is a normal node package then it's ok because it does not need compilation
	if (!this.pkg.gismo || typeof this.pkg.gismo !== "object") {
		return true;
	}

	var srcfiles = this.pkg.gismo.src;
	if (!srcfiles || typeof srcfiles !== "object") {
		try {
			srcfiles = fs.readdirSync(path.join(this.path, "src"));
			for(var i = 0; i < srcfiles.length; i++) {
				srcfiles[i] = path.join(this.path, "src", srcfiles[i]);
			}
		}
		catch(err) {
			srcfiles = [];
		}
	}

	var cmpfiles = this.pkg.gismo.compiler;
	if (!cmpfiles || typeof cmpfiles !== "object") {
		try {
			cmpfiles = fs.readdirSync(path.joion(this.path, "compiler"));
			for(var i = 0; i < cmpfiles.length; i++) {
				cmpfiles[i] = path.join(this.path, "compiler", cmpfiles[i]);
			}
		}
		catch(err) {
			cmpfiles = [];
		}
	}

	var main = path.join(this.path, this.pkg.main ? this.pkg.main : "index.js");
	var meta = this.metaFile();

	return this.checkMTime(main, srcfiles) && this.checkMTime(meta, cmpfiles);
};

Compiler.prototype.checkMTime = function(dest, sources) {
	try {
		var mtime = fs.statSync(dest).mtime.getTime();
		for(var i = 0; i < sources.length; i++) {
			var mtime2 = fs.statSync(sources[i]).mtime.getTime();
			if (mtime2 > mtime) {
				return false;
			}
		}
	} catch(err) {
		console.log(err.toString().red)
		return false;
	}
	return true;
};

Compiler.prototype.resolveModule = function(parser, modulePath) {
	if (modulePath.slice(0,6) === "gismo" + path.sep) {
		// Seach the module in the lib-directory of this gismo installation
		var p = path.dirname(__filename);
		p = path.join(p, "lib", modulePath.slice(6));
		try {
			var jsfile = require.resolve(p);
			try {
				var jsfileGlobal = require.resolve(path.join("gismo", "lib", modulePath.slice(6)));
				// If the global installation is the same as this gismo installation, then use the global path
				if (jsfile === jsfileGlobal) {
					return {modulePath: path.join("gismo", "lib", modulePath.slice(6)), jsfile: jsfile};
				}
			} catch(err) {
				// Do nothing by intention
			}
			// Return the local path
			return {modulePath: path.dirname(jsfile), jsfile: jsfile};
		} catch(err) {
			// Do nothing by intention
		}
	}

	try {
		var jsfile = require.resolve(modulePath);
	} catch(err) {
		parser.throwError(null, errors.Messages.UnknownModule, modulePath);
//		throw new Error(errors.Messages.UnknownModule.replace(/%(\d)/g, modulePath));
	}
	return {modulePath: modulePath, jsfile: jsfile};
};

exports.Compiler = Compiler;
