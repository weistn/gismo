var expect = require('chai').expect;
var lexer = require('../lexer.js');

describe("My LexerTest", function() {
	it('lex', function() {
		var t = lexer.newTokenizer('function(x) { return "Hello World" }');
/*		var token;
		while(token = t.next()) {
			console.log(token);
		} */
	});
});
