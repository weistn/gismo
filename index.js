var parser = require('./parser.js');

function dodummy() {
	console.log("Hallo App");
	parser.foo();
	return 42;
}

exports.dodummy = dodummy;
