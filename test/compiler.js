var expect = require('chai').expect;
var compiler = require('../compiler.js');

describe("Compiler Test", function() {
	it('compile', function() {
		var c = new compiler.Compiler('./test/module2');
		c.compileModule();
	});
});