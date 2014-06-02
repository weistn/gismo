var expect = require('chai').expect;
var mydummy = require('../parser.js');
var foo = mydummy.foo;

describe("My Parser Test", function() {
	it('returns 42', function() {
		expect(foo()).equal(42);
	});
});
