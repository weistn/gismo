var fs = require('fs');
var libpath = require('path');
var escodegen = require('escodegen');
var lexer = require('./lexer.js');
var parser = require('./parser.js');
var errors = require('./errors.js');

function Compiler(path) {
	this.path = path;
	if (this.path === "") {
		throw new errors.SyntaxError("Illegal path for a module: " + path);
	}
	if (this.path[this.path.length - 1] != "/") {
		this.path += "/";
	}
	// Try to read the package.json
	try {
		this.pkg = JSON.parse(fs.readFileSync(this.path + 'package.json', 'utf8'));
	} catch(err) {
		throw new errors.SyntaxError("Unknown module " + path);
	}
	this.imports = { };
	this.currentImportPath = undefined;
}

// Called from the parser that is launched on behalf of compileModule().
Compiler.prototype.importMetaModule = function(path, alias) {
	if (path === "") {
		throw new Error("Implementation Error: Illegal path for a module.");
	}
	if (path[path.length - 1] != "/") {
		path += "/";
	}
	// Try to read the package.json
	var pkg;
	try {
		if (path === this.path) {
			pkg = this.pkg;
		} else {
			pkg = JSON.parse(fs.readFileSync(path + 'package.json', 'utf8'));
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
	var metafile = libpath.resolve(libpath.join(path, "_meta.js"));
	if (!fs.existsSync(metafile)) {
		throw new Error("The module '" + path + "' has not yet been compiled");
	}

	this.imports[metafile] = {module: m, alias: alias};

	var m;
	try {
		m = require(metafile);
		m.extendParser(this.parser);
	} catch(err) {
		if (err instanceof errors.SyntaxError) {
			throw err;
		}
		var e = new errors.CompilerError(err.toString());
		e.stack = err.stack;
		throw e;
	}
};

Compiler.prototype.importAlias = function(m) {
	var m = this.imports[m.filename];
	if (!m) {
		return null;
	}
	return m.alias;
};

Compiler.prototype.compileModule = function() {
	// If it is a normal node package, do nothing
	if (!this.pkg.gismo || typeof this.pkg.gismo !== "object") {
		return;
	}

	this.compileMetaModule();

	var srcfiles = this.pkg.gismo.src;
	if (!srcfiles || typeof srcfiles !== "object") {
		srcfiles = fs.readdirSync(this.path + "src").sort();
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
			str = fs.readFileSync(this.path + "src/" + fname).toString();
		} catch(err) {
			throw new Error("Could not read '" + this.path + "src/" + fname + "'");
		}
		this.parser = new parser.Parser(this);
		this.importMetaModule(this.path, "module");
		program.body = program.body.concat(this.parser.parse(lexer.newTokenizer(str, libpath.join(this.path, "src/", fname))));
	}

	var main = this.pkg.main ? this.pkg.main : "index.js";
	var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: true, file: main});
//	console.log(JSON.stringify(result.code));
	var code = result.code + "\n//# sourceMappingURL=" + main + ".map";
	fs.writeFileSync(libpath.join(this.path, main), code);
	fs.writeFileSync(libpath.join(this.path, main + '.map'), result.map.toString());
};

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
		this.parser = new parser.Parser(this);
		program.body = program.body.concat(this.parser.parse(lexer.newTokenizer(str, this.path + "compiler/" + fname)));
	}

	var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: this.pkg.name, sourceContent: str});
//	console.log(JSON.stringify(result.code));
	var code = "exports.extendParser = function(parser) { "+ result.code + "\n}\n//# sourceMappingURL=_meta.js.map";
	fs.writeFileSync(this.metaFile(), code);
	fs.writeFileSync(this.metaFile() + '.map', result.map.toString());
};

Compiler.prototype.metaFile = function() {
	// Which file contains the metailed import?
	var metafile = this.pkg.gismo.metafile;
	if (typeof metafile !== "string" || metafile === "") {
		metafile = this.path + "_meta.js";
	}
	return metafile;
};

exports.Compiler = Compiler;