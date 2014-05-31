var expect = require('chai').expect;
var mydummy = require('../lexer.js');
var foo = mydummy.foo;

describe("My LexerTest", function() {
	it('lexec', function() {
		console.log(mydummy.tokenize('function(x) { return "Hello World" }', {loc: true}));
	});
});
