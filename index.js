var program = require('commander');
var compiler = require('./compiler.js');
var path = require('path');
var fs = require('fs');
var errors = require('./errors.js');
var colors = require('colors');
var promptly = require('promptly');

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
				"gismo": { }
			};
			fs.writeFileSync(path.join(value, "package.json"), JSON.stringify(pkg, null, '    '));
			fs.writeFileSync(path.join(value, "src", path.basename(value) + ".gs"), "");
			fs.writeFileSync(path.join(value, "compiler", "compiler_" + path.basename(value) + ".gs"), "");
		} catch(err) {
			console.log("Failed to create module\n".yellow, err.toString());
		}
	});
}

function compileModules() {
	var args = Array.prototype.slice.call(arguments, 0);
	for(var i = 0; i < args.length - 1; i++) {
		var arg = path.resolve(args[i]);
		if (!compileModule(arg)) {
			return false;
		}
	}
	return true;
}

function compileModule(arg) {
	try {
		var c = new compiler.Compiler(arg);
		c.compileModule();
		return true;
	} catch(err) {
		if (err instanceof errors.SyntaxError) {
			console.log(err.toString().yellow);
		} else if (err instanceof errors.CompilerError) {
			if (!err.stack) {
				console.log("Oooops", err.toString());
				process.exit();
			}
			var parsed = errors.parseStackTrace(err.stack);
//			console.log(parsed.message.blue);
			for(var k = 0; k < parsed.stack.length; k++) {
				var line = parsed.stack[k];
				if (line.function === "Compiler.importMetaModule") {
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
	return false;
}

function execModule() {
	var args = Array.prototype.slice.call(arguments, 0);
	if (args.length !== 2) {
		program.outputHelp();
		process.exit();
	}
	var modulePath = args[0];
//	// If it is not an absolute path, treat it as a relative path
//	if (modulePath[0] != path.sep) {
//		modulePath = "." + path.sep + modulePath;
//	}
	// Does the module need compilation?
	var c = new compiler.Compiler(modulePath);
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
			for(var k = parsed.stack.length - 1; k >= 0; k--) {
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

program
	.version(pkg.version)
	.usage('[options] [command] <module ...>')

program
	.command('init')
	.description('create a new gismo module')
	.action( initModule );

program
	.command('compile')
	.description('compiles gismo modules')
	.action( compileModules );

program
	.command('*')
	.description('execute a gismo module')
	.action( execModule );

program.parse(process.argv);
