var program = require('commander');
var compiler = require('./compiler.js');
var path = require('path');
var fs = require('fs');
var errors = require('./errors.js');
var colors = require('colors');

var pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(module.filename), 'package.json'), 'utf8'));

program
  .version(pkg.version)
  .usage('[options] <module_path ...>')
  .parse(process.argv);

for(var i = 0; i < program.args.length; i++) {
	var arg = path.resolve(program.args[i]);
	try {
		var c = new compiler.Compiler(arg);
		c.compileModule();
	} catch(err) {
		if (err instanceof errors.SyntaxError) {
			console.log(err.toString().yellow);
		} else if (err instanceof errors.CompilerError) {
			var parsed = errors.parseStackTrace(err.stack);
			console.log(parsed.message.blue);
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
				console.log(JSON.stringify(errors.parseStackTrace(err.stack)));
			} else {
				console.log(err.toString().red);
			}
		}
	}
}