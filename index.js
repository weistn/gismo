var program = require('commander');
var compiler = require('./compiler.js');
var path = require('path');
var fs = require('fs');

var pkg = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

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
		console.log(err.toString());
	}
}