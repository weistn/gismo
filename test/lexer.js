var expect = require('chai').expect;
var lexer = require('../lexer.js');

describe("My LexerTest", function() {
	it('lex', function() {
		lexer.setSource('function(x) { return "Hello World" }');
		var token;
		while(token = lexer.next()) {
			console.log(token);
		}
	});
});
