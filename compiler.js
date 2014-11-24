var fs = require('fs');
var path = require('path');
var lexer = require('./lexer.js');
var parser = require('./parser.js');
var errors = require('./errors.js');
var defspiller = require('./spiller.js');
var escodegen = require('escodegen');

var Mode = {
	Module : 1,
	File : 2,
	Directory: 3,
	Node: 4
};

/// Creates a compiler that can compile the specified module.
/// The same compiler cannot be used to compile another module.
/// `modulePath` is either a relative or absolute filename of a gismo file (ending with `*.gs`)
/// or the absolute or relative path of a directory of a package, which contains a file called `package.json`.
function Compiler(builder, modulePath, options, version) {
	this.path = modulePath;
	this.version = version;
	this.builder = builder;
	this.imports = { };
	this.spillers = { };
	this.mode = null;

	// Is it a file or a single module?
	try {
		var stat = fs.statSync(modulePath);
		if (stat.isFile()) {
			this.mode = Mode.File;
		} else if (!stat.isDirectory()) {
			throw new errors.CompilerError("Path " + this.path + " is neither a regular file nor a directory");
		}
	} catch(err) {
		throw new errors.CompilerError("Unknown module " + this.path);
	}

	// Read package information if available
	if (this.mode === Mode.File) {
		if (path.extname(this.path) != ".gs") {
			throw new errors.CompilerError("Not a gismo file " + this.path);
		}
		this.pkg = {};
	} else {
		if (this.path === "") {
			throw new errors.CompilerError("Illegal path for a module: " + this.path);
		}
		if (this.path[this.path.length - 1] != path.sep) {
			this.path += path.sep;
		}
		// Try to read the package.json
		try {
			this.pkg = JSON.parse(fs.readFileSync(path.join(this.path, 'package.json'), 'utf8'));
		} catch(err) {
			throw new errors.CompilerError("Unknown module " + this.path);
		}

		if (!this.pkg.gismo) {
			this.mode = Mode.Node;
		} else if (!this.pkg.gismo.uniqueId) {
			this.mode = Mode.Directory;
		} else {
			this.mode = Mode.Module;
		}
	}

	// Compute options based on package.json data and options passed via the command line interface
	this.options = {};
	if (this.pkg.gismo) {
		for(var key in this.pkg.gismo) {
			this.options[key] = this.pkg.gismo[key];
		}
	}
	for(var key in options) {
		// Filter out attributes that commander.js put in the options object
		if (key !== "commands" && key !== "options" && key !== "parent" && key[0] !== "_") {
			this.options[key] = options[key];
		}
	}

	if (this.pkg && this.pkg.gismo && this.pkg.gismo.uniqueId) {
		// Install spillers to produce code etc. during compilation
		if (this.options.weblib) {
			this.spillers["default"] = new defspiller.WeblibSpiller(this);
			this.spillers["dependencies"] = new defspiller.DependenciesSpiller(this);
		} else {
			this.spillers["default"] = new defspiller.NodeJSSpiller(this);
		}

		if (this.options.dependencies) {
			this.spillers["dependencies"] = new defspiller.DependenciesSpiller(this);
		}
	} else if (this.options.doc && this.pkg && this.pkg.gismo && this.pkg.gismo.docModule) {
		// Install spiller for the documentation
		var p = new parser.Parser(this);
		var tmp = this.resolveModule(p, this.pkg.gismo.docModule);
		// Import the gismo module
		try {
			// Import the gismo module. It will install a spiller
			var pa = path.dirname(tmp.jsfile);
			p.importModuleRunning = true;
			this.importMetaModule(p, pa, "__docModule__", this.pkg.gismo.docModule);
			p.importModuleRunning = false;
		} catch(err) {
			if (err instanceof errors.SyntaxError || err instanceof errors.CompilerError) {
				throw err;
			}
			var e = new errors.CompilerError(err.toString());
			e.stack = err.stack;
			throw e;
		}
	}
}

/// Returns a reference to the builder that created this compiler object or
/// null if no builder is involved, e.g. if only a single module is being compiled.
Compiler.prototype.getBuilder = function() {
	return this.builder;
};

/// Sets the spiller that is used by the compiler to generate output.
Compiler.prototype.addSpiller = function(name, spiller) {
	this.spillers[name] = spiller;
};

/// Returns the spiller used by the compiler to generate output.
Compiler.prototype.getSpiller = function(name) {
	return this.spillers[name];
};

/// Returns true if the module path of the compiler object refers to a single file.
Compiler.prototype.isFileMode = function() {
	return this.mode === Mode.File;
};

/// Returns true if the module path of the compiler object contains a 'package.json' file which
/// has a gismo section but no build target for JavaScript code.
Compiler.prototype.isDirectoryMode = function() {
	return this.mode === Mode.Directory;
};

/// Returns true if the module path of the compiler object contains a 'package.json' file which
/// has a gismo section and a build target for JavaScript code.
Compiler.prototype.isModuleMode = function() {
	return this.mode === Mode.Module;
};

/// Returns true if the module path of the compiler object contains a 'package.json' file which
/// has no gismo section, i.e. it is an oridnary node package.
Compiler.prototype.isNodeMode = function() {
	return this.mode === Mode.Module;
};

// Called from the parser that is launched on behalf of compileModule().
// 'modulePath' is the directory that contains the module.
// 'alias' is the JS identifier that is used by the importing module to refer to the imported module.
// 'name' is the string following the import statement, e.g. in 'import "gismo/foo/bar' the name is 'gismo/foo/bar' 
Compiler.prototype.importMetaModule = function(parser, modulePath, alias, name) {
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
			pkg = JSON.parse(fs.readFileSync(path.join(modulePath, 'package.json'), 'utf8'));
		}
	} catch(err) {
		pkg = { };
	}

	if (name) {
		for(var key in this.spillers) {
			var s = this.spillers[key];
			s.addDependency(modulePath, pkg, alias, name, this.compilingMetaModule);
		}
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

/// Compiles the module, including its meta module.
/// This is the main entry function of the Compiler.
Compiler.prototype.compileModule = function() {
	if (this.pkg && (!this.pkg.gismo || !this.pkg.gismo.uniqueId)) {
//		this.spill();
		return;
	}

	var srcfiles = [];

	// Compiling a single file or a package?
	if (this.mode === Mode.File) {
		srcfiles = [{
			filename: this.path,
			action: { action: "compile"}
		}];
	} else {
		// If it is a normal node package, do nothing
		if (!this.pkg.gismo || typeof this.pkg.gismo !== "object") {
			return;
		}

		// Compile the module's meta code
		this.compileMetaModule();

		// Compute all source files belonging to the module
		var filenames = this.pkg.gismo.src;
		if (!filenames || typeof filenames !== "object") {
			try {
				filenames = fs.readdirSync(this.path + "src").sort();
			} catch(e) {
				filenames = [];
			}
		}

		// Figure out what to do with each file
		for(var i = 0; i < filenames.length; i++) {
			var fname = filenames[i];
			if (fname[0] === '.') { // || fname.length < 4 || fname.substr(fname.length - 3, 3) !== ".gs") {
				continue;
			}
			if (!this.pkg.gismo.extensions) {
				srcfiles.push({
					filename: path.join(this.path, "src", fname),
					action: { action: "compile"}
				});
				continue;
			}
			// What about the file name extension?
			var index = fname.lastIndexOf(".");
			if (index === -1) {
				continue;
			}
			var ext = fname.substr(index);
			for(var key in this.pkg.gismo.extensions) {
				if (key === ext) {
					var action = this.pkg.gismo.extensions[key];
					if (typeof action === "string") {
						action = { action: action };
					}
					switch (action.action) {
					case "compile":
					case "copy":
						srcfiles.push({
							filename: path.join(this.path, "src", fname),
							action: action
						});
						break;
					default:
						throw new errors.CompilerError("In 'package.json': Action '" + action.action + "' for extension '" + ext + "' is not known");
					}
					continue;
				}
			}
			// Ignore the file
		}
	}

	var program = {type: "Program", body: []};

	// Process all files
	for(var i = 0; i < srcfiles.length; i++) {
		// What should happen to this source file?
		var action = srcfiles[i].action;
		var fname = srcfiles[i].filename;
		if (action.action === "copy") {
			// Add the file to all spillers, but do not attempt to compile it
			for(var key in this.spillers) {
				this.spillers[key].addFile(fname, null, null, action);
			}
			continue;
		}

		// Read the source file from disk
		var str;
		try {
			str = fs.readFileSync(fname).toString();
		} catch(err) {
			throw new Error("Could not read '" + fname + "'");
		}
		// Create a parser
		var p = new parser.Parser(this);
//		p.importModuleName = this.path;
		// Import the meta module for this package
		this.importMetaModule(p, this.path, "module");

		// Import the documentation module if required
		if (this.options.doc && this.pkg.gismo.docModule) {
			var tmp = this.resolveModule(parser, this.pkg.gismo.docModule);
			// Import the gismo module
			var pa = path.dirname(tmp.jsfile);
			p.importModuleRunning = true;
			this.importMetaModule(p, pa, "__docModule__", this.pkg.gismo.docModule);
			p.importModuleRunning = false;
		}

		// Parse the source file
		var body = p.parse(lexer.newTokenizer(str, fname));
		try {
			// Add the file to all spillers
			for(var key in this.spillers) {
				// Does the file require a special spiller?
				if (body.spillers && body.spillers[key]) {
					body.spillers[key].spill(fname, body, str, action);
				} else {
					this.spillers[key].addFile(fname, body, str, action);
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

	this.spill();
};

Compiler.prototype.spill = function() {
	// Spill the resulting code
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

	this.compilingMetaModule = true;

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

		// Import the documentation module if required
		if (this.options.doc && this.pkg.gismo.docModule) {
			var tmp = this.resolveModule(parser, this.pkg.gismo.docModule);
			// Import the gismo module
			var pa = path.dirname(tmp.jsfile);
			p.importModuleRunning = true;
			this.importMetaModule(p, pa, "__docModule__", this.pkg.gismo.docModule);
			p.importModuleRunning = false;
		}

		var body = p.parse(lexer.newTokenizer(str, this.path + "compiler/" + fname));
		program.body = program.body.concat(body);
		try {
			// Add the file to all spillers
			for(var key in this.spillers) {
				// Does the file require a special spiller?
				if (body.spillers && body.spillers[key]) {
					body.spillers[key].spill(fname, body, str, "compile");
				} else if (this.spillers[key].addMetaFile) {
					this.spillers[key].addMetaFile(fname, body, str, "compile");
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

	var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: true, sourceContent: this.metaFile()});
//	console.log(JSON.stringify(result.code));
	var code = "exports.extendParser = function(parser) { "+ result.code + "\n}\n//# sourceMappingURL=_meta.js.map";
	fs.writeFileSync(this.metaFile(), code);
	fs.writeFileSync(this.metaFile() + '.map', result.map.toString());

	this.compilingMetaModule = false;
};

Compiler.prototype.mainFile = function() {
	var main;
	if (this.mode === Mode.File) {
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
	if (this.mode === Mode.File) {
		return null;
	}
	// Which file contains the compiled meta code?
	var metafile = this.pkg.gismo.metaFile;
	if (typeof metafile !== "string" || metafile === "") {
		metafile = path.join(this.path, "_meta.js");
	}
	return metafile;
};

// Returns the directory to which the application should be deployed after compilation
Compiler.prototype.deployTo = function() {
	var p = this.mode === Mode.File ? path.dirname(this.path) : this.path;
	if (this.pkg.deployTo) {
		return path.resolve(path.join(p, this.pkg.gismo.deployTo));
	}
	return path.resolve(path.join(p, "deploy"));	
};

// Returns the 'package.json' as a parsed JSON object
Compiler.prototype.getPackage = function() {
	return this.pkg;
};

Compiler.prototype.isUpToDate = function() {
	if (this.mode === Mode.File) {
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

/// Searches for a nodejs module that has been imported via `import "modulePath"`.
/// The parser is either an instance of the parser class or an object that implements
/// a matching `throwError(token, string, args ...)` function to signal errors.
///
/// Returns an object with two properties. `modulePath` is the resolved path to the module.
/// `modulePath` can be used with NodeJS require to import the module.
/// `jsfile` is the path of the nodejs module's main source file.
/// If the module is a gismo module, the `jsfile` will always point to the `main.js` file.
Compiler.prototype.resolveModule = function(parser, modulePath) {
	// Search a gismo standard library module?
	if (modulePath.slice(0,6) === "gismo" + path.sep) {
		// Seach the module in the lib-directory of this gismo installation
		var p = path.dirname(__filename);
		p = path.join(p, "lib", modulePath.slice(6));
		try {
			var jsfile = require.resolve(p);
			// Search the module in the global gismo installation (if there is one)
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

	// Try to locate the module as a globally installed gismo module
	try {
		var jsfile = require.resolve(modulePath);
	} catch(err) {
		if (this.mode === Mode.File) {
			parser.throwError(null, errors.Messages.UnknownModule, modulePath);
		}
		// Check in the 'node_modules' directory
		try {
			jsfile = require.resolve(path.join(this.path, "node_modules", modulePath));
		} catch(err) {
			parser.throwError(null, errors.Messages.UnknownModule, modulePath);
		}
		return {modulePath: modulePath, jsfile: jsfile};
	}
	return {modulePath: modulePath, jsfile: jsfile};
};

exports.Compiler = Compiler;
exports.Mode = Mode;
