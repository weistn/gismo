var program = require('commander');
var compiler = require('./compiler.js');
var build = require('./build.js');
var path = require('path');
var fs = require('fs');
var errors = require('./errors.js');
var colors = require('colors');
var promptly = require('promptly');
var crypto = require('crypto');

var pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(module.filename), 'package.json'), 'utf8'));

function initModule() {
	var args = Array.prototype.slice.call(arguments, 0);
	if (args.length !== 1) {
		program.outputHelp();
		process.exit();
	}

	console.log("To create a new gismo module, answer the following questions".cyan);
	promptly.prompt('Module name: ', { }, function(err, value) {
		if (fs.existsSync(value)) {
			console.log("A file or directory of this name already exists".yellow);
			return;
		}
		var h = crypto.createHash("md5");
		h.write(Math.random().toString());
		var hv = h.digest();
		var id = hv.hexSlice(0, hv.length);
		try {
			fs.mkdirSync(value);
			fs.mkdirSync(path.join(value, "src"));
			fs.mkdirSync(path.join(value, "compiler"));
			fs.mkdirSync(path.join(value, "test"));
			var pkg = {
				"name": value,
				"version": "0.0.1",
				"description": "TODO",
				"main": "main.js",
				"author": "TODO",
				"license": "TODO",
				"gismo": {
					"uniqueId": id
				}
			};
			fs.writeFileSync(path.join(value, "package.json"), JSON.stringify(pkg, null, '    '));
			fs.writeFileSync(path.join(value, "src", path.basename(value) + ".gs"), "");
			fs.writeFileSync(path.join(value, "compiler", "compiler_" + path.basename(value) + ".gs"), "");
		} catch(err) {
			console.log("Failed to create module\n".yellow, err.toString());
		}
	});
}

function cleanModule() {
	var options = arguments[arguments.length - 1];
	var m = require("./clean.js");
	var args = Array.prototype.slice.call(arguments, 0);
	if (args.length === 1) {
		args = ["./", null];
	}
	for(var i = 0; i < args.length - 1; i++) {
		m.cleanModule(args[i], !!options.recursive);
	}
}

function compileModules() {
	var args = Array.prototype.slice.call(arguments, 0);
	for(var i = 0; i < args.length - 1; i++) {
		var arg = path.resolve(args[i]);
		if (compileCmd.recursive) {
			var b = new build.Builder(arg, compileCmd, pkg.version);
			if (!b.build()) {
				return false;
			}
		} else {
			if (!compileModule(arg, compileCmd)) {
				return false;
			}
		}
	}
	return true;
}

function compileModule(arg, options) {
	try {
		var c = new compiler.Compiler(null, arg, options, pkg.version);
		c.compileModule();
		return true;
	} catch(err) {
		displayError(err);
		return false;
	}
}

function displayError(err) {
	if (err instanceof errors.SyntaxError) {
		console.log(err.toString().yellow);
	} else if (err instanceof errors.CompilerError) {
		if (!err.stack) {
			console.log(err.toString().yellow);
			process.exit();
		}
//			console.log(JSON.stringify(err.stack, null, "\n"));
		var parsed = errors.parseStackTrace(err.stack);
//			console.log(parsed.message.blue);
		for(var k = 0; k < parsed.stack.length; k++) {
			var line = parsed.stack[k];
			if (line.function === "Compiler.importMetaModule") {
				break;
			}
			if (line.function === "Compiler.compileModule") {
				break;
			}
			if (line.function === "Parser.execGenerator") {
				break;
			}
			if (line.function === "Parser.execUnaryGenerator") {
				break;
			}
			if (line.function === "Parser.execBinaryGenerator") {
				break;
			}
//				console.log(('    at ' + line.function + ' (' + line.loc.filename + ':' + line.loc.lineNumber + ':' + line.loc.column + ')').blue);
		}
		parsed.stack = parsed.stack.slice(0, k);
		printStackTrace(parsed);
	} else {
		if (err.stack) {
			console.log(err.stack.toString().red);
		} else {
			console.log(err.toString().red);
		}
	}
}

function execModule() {
	var args = Array.prototype.slice.call(arguments, 0);
	if (args.length !== 2) {
		program.outputHelp();
		process.exit();
	}
	var modulePath = path.resolve(args[0]);
//	// If it is not an absolute path, treat it as a relative path
//	if (modulePath[0] != path.sep) {
//		modulePath = "." + path.sep + modulePath;
//	}
	// Does the module need compilation?
	var c = new compiler.Compiler(null, modulePath, compileCmd, pkg.version);
	if (!c.isUpToDate()) {
		if (!compileModule(modulePath)) {
			return;
		}
	}
	modulePath = c.mainFile();
	// Load and execute the module
	try {
		require(modulePath);
	} catch(err) {
		if (err.stack) {
			var parsed = errors.parseStackTrace(err.stack);
			// Strip lines of the stack trace that are caused by this file (i.e. __filename) or by this file calling 'require' in module.js.
			for(var k = 0; k < parsed.stack.length; k++) {
//			for(var k = parsed.stack.length - 1; k >= 0; k--) {
				var line = parsed.stack[k];
				if (line.loc.filename === __filename) {
					for( k--; k >= 0; k--) {
						line = parsed.stack[k];
						if (line.loc.filename !== "module.js") {
							break;
						}
						parsed.stack = parsed.stack.slice(0, k);
					}
					break;
				}
			}
			printStackTrace(parsed);
		} else {
			console.log(err.toString().red);
		}
	}
}

function printStackTrace(parsed) {
	// console.log(err.stack.toString().yellow);
	var sourceMap = require('source-map');
	console.log(parsed.message.blue);

	for(var k = 0; k < parsed.stack.length; k++) {
		var line = parsed.stack[k];
		// Try to load a source map
		try {
			var sm = JSON.parse(fs.readFileSync(line.loc.filename + ".map").toString());
			var smc = new sourceMap.SourceMapConsumer(sm);
			var loc = smc.originalPositionFor({
				line: line.loc.lineNumber,
				column: line.loc.column
			});
			console.log(('    at ' + (loc.name ? loc.name : line.function) + ' (' + loc.source + ':' + loc.line + ':' + loc.column + ')').blue);
		} catch(err) {
//					console.log("Failed reading source map".red, line.loc.filename + ".map", err.toString().red);
			console.log(('    at ' + line.function + ' (' + line.loc.filename + ':' + line.loc.lineNumber + ':' + line.loc.column + ')').blue);
		}
	}
}

exports.displayError = displayError;

program
	.version(pkg.version)
	.usage('[options] [command] <module ...>')

program
	.command('init')
	.description('create a new gismo module')
	.action( initModule );


var compileCmd = program
	.command('compile')
	.option('-d --doc', 'Generate documentation from the source code')
	.option('-w --weblib', 'Generate a library that can be used in a web app.\n\t\t\t   File names have the postfix ".weblib.js"')
	.option('-p --dependencies', 'Write all external dependencies to "dependencies.json"')
	.option('-v --graphviz', 'Only useful in combination with --dependencies.\n\t\t\t   Creates a graphviz visualization in "dependencies.dot"')
	.option('-y --deploy [path]', 'Copy the compiler output to the default deployment location\n\t\t\t   ("./deploy" or as mentioned in package.json) or to the specified path\n\t\t\t   Only useful in combination with --weblib')
	.option('-Y --deployall [path]', 'Like -y, but all dependencies are deployed, too')
	.option('-r --recursive', 'Builds modules contained in sub-directories as well')
	.description('compiles gismo modules')
	.action( compileModules );

program
	.command('clean')
	.option('-r --recursive', 'Cleans modules contained in sub-directories as well')
	.description('Cleans a gismo module from all generated files')
	.action( cleanModule );

program
	.command('*')
	.description('execute a gismo module')
	.action( execModule );

program.parse(process.argv);
