var fs = require('fs');
var escodegen = require('escodegen');
var lexer = require('./lexer.js');
var parser = require('./parser.js');

function Compiler(path) {
	this.path = path;
	if (this.path === "") {
		throw "Error: Illegal path for a module";
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

Compiler.prototype.importModule = function() {
	// No gismo section? -> a normal node module
	if (!this.pkg.gismo) {
		// Return an empty module
		return {exports:{syntax:{}}};
	}
	// Which file contains the precompiled import?
	var precompfile = this.precompFile();
	// Check whether the precompiled file exists and read it
	try {
		console.log("Try to read precompiled import ", precompfile);
		var js = fs.readFileSync(precompfile).toString();
	} catch(err) {
		console.log("No precompFile. Will compile instead");
		return this.compileModule();
	}

	var p = new parser.Parser();
	p.tokenizer = lexer.newTokenizer("");
	try {
		p.executeAtCompileTime(js);
		// TODO
		return {exports:{syntax:{}}};
	} catch(err) {
		throw "Error: Import of '" + this.path + "' failed: " + err.toString();
	}
};

// precompfile is optional
Compiler.prototype.compileModule = function() {
	if (!this.pkg.gismo || typeof this.pkg.gismo !== "object") {
		throw "Error: '" + this.path + "' is not a gismo package";
	}
	var srcfiles = this.pkg.gismo.src;
	if (!srcfiles || typeof srcfiles !== "object") {
		srcfiles = fs.readdirSync(this.path + "src").sort();
	}

	var program = {type: "Program", body: []};

	// Parse and compile all files
	var p = new parser.Parser()
	for(var i = 0; i < srcfiles.length; i++) {
		var fname = srcfiles[i];
		if (fname[0] === '.' || fname.length < 4 || fname.substr(fname.length - 3, 3) !== ".gs") {
			continue;
		}
		var str;
		try {
			str = fs.readFileSync(this.path + "src/" + fname).toString();
		} catch(err) {
			throw "Error: Could not read '" + this.path + "src/" + fname + "'";
		}
		program.body = program.body.concat(p.parse(lexer.newTokenizer(str)));
	}

	program.body.unshift({
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "__runtime"
                },
                "init": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "Identifier",
                        "name": "require"
                    },
                    "arguments": [
                        {
                            "type": "Literal",
                            "value": "./runtime.js",
                            "raw": "'./runtime.js'"
                        }
                    ]
                }
            }
        ],
        "kind": "var"
    });

	var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: this.pkg.name, sourceContent: str});
//	console.log(JSON.stringify(result.code));
	var main = this.pkg.name ? this.pkg.name : "index.js";
	var code = result.code + "\n//# sourceMappingURL=" + this.pkg.main + ".map";
	fs.writeFileSync(this.path + this.pkg.main, code);
	fs.writeFileSync(this.path + this.pkg.main + '.map', result.map.toString());

	var precompiled = "function() {\n" + p.precompSrc + "\n}\n";
	fs.writeFileSync(this.precompFile(), precompiled);

	// TODO
	return {exports:{syntax:{}}};
}

Compiler.prototype.precompFile = function() {
	// Which file contains the precompiled import?
	var precompfile = this.pkg.gismo.precompiled;
	if (typeof precompfile !== "string" || precompfile === "") {
		precompfile = this.path + "_precomp.js";
	}
	return precompfile;
};

exports.Compiler = Compiler;