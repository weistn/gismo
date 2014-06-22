var fs = require('fs');
var escodegen = require('escodegen');
var lexer = require('./lexer.js');
var parser = require('./parser.js');

function Compiler(path) {
	this.path = path;
	if (this.path === "") {
		throw new Error("Illegal path for a module: " + path);
	}
	if (this.path[this.path.length - 1] != "/") {
		this.path += "/";
	}
	// Try to read the package.json
	try {
		this.pkg = JSON.parse(fs.readFileSync(this.path + 'package.json', 'utf8'));
	} catch(err) {
		this.pkg = { };
	}
}

// Called from the parser that is launched on behalf of compileModule().
Compiler.prototype.importMetaModule = function(path) {
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
	var metafile = path + "_meta.js";
	if (!fs.existsSync(metafile)) {
		throw new Error("Import Error: The module '" + path + "' has not been compiled");
//		var c = new Compiler(path);
//		c.compileMetaModule();
	}

	try {
		var m = require(metafile);
		m.extendParser(this.parser);
	} catch(err) {
		throw new Error("Import Error while importing " + metafile + "\n" + err.stack);
	}
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
		this.parser = new parser.Parser(this)
		this.importMetaModule(this.path);
		program.body = program.body.concat(this.parser.parse(lexer.newTokenizer(str, this.path + "src/" + fname)));
	}

	var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: this.pkg.name});
//	console.log(JSON.stringify(result.code));
	var main = this.pkg.name ? this.pkg.name : "index.js";
	var code = result.code + "\n//# sourceMappingURL=" + this.pkg.main + ".map";
	fs.writeFileSync(this.path + this.pkg.main, code);
	fs.writeFileSync(this.path + this.pkg.main + '.map', result.map.toString());
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
		this.parser = new parser.Parser(this)
		program.body = program.body.concat(this.parser.parse(lexer.newTokenizer(str, this.path + "src/" + fname)));
	}

	var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: this.pkg.name, sourceContent: str});
//	console.log(JSON.stringify(result.code));
	var main = this.pkg.name ? this.pkg.name : "index.js";
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

function MetaCompiler(path) {
	Compiler.call(this, path);
}

MetaCompiler.prototype.compileModule = function() {

};

MetaCompiler.prototype.metaFile = Compiler.prototype.metaFile;
MetaCompiler.prototype.importModule = Compiler.prototype.importModule;

exports.MetaCompiler = MetaCompiler;
exports.Compiler = Compiler;