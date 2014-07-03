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
		try {
			var c = new compiler.Compiler(arg);
			c.compileModule();
		} catch(err) {
			if (err instanceof errors.SyntaxError) {
				console.log(err.toString().yellow);
			} else if (err instanceof errors.CompilerError) {
				if (!err.stack) {
					console.log("FUCK", err.toString());
					process.exit();
				}
				var parsed = errors.parseStackTrace(err.stack);
//				console.log(parsed.message.blue);
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
					console.log(('    at ' + line.function + ' (' + line.loc.filename + ':' + line.loc.lineNumber + ':' + line.loc.column + ')').blue);
				}
			} else {
				if (err.stack) {
					console.log(err.stack.toString().red);
				} else {
					console.log(err.toString().red);
				}
			}
		}
	}
}

function execModule() {
	var args = Array.prototype.slice.call(arguments, 0);
	if (args.length !== 2) {
		program.outputHelp();
		process.exit();
	}
	var modulePath = args[0];
	if (modulePath[0] != path.sep) {
		modulePath = "." + path.sep + modulePath;
	}
	try {
		require(modulePath);
	} catch(err) {
		if (err.stack) {
			var parsed = errors.parseStackTrace(err.stack);
			console.log(err.stack.toString().red);
		} else {
			console.log(err.toString().red);
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
