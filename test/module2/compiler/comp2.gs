import 'module1'

console.log("Compiler code of module2, here called", parser.importAlias(module));

parser.extendSyntax({
	type: 'statement',
	name: "linelog",
	parser: function() {
		parser.parseEndOfStatement();
		return {
            "type": "ExpressionStatement",
            "expression": {
                "type": "CallExpression",
                "callee": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                        "type": "Identifier",
                        "name": "console"
                    },
                    "property": {
                        "type": "Identifier",
                        "name": "log"
                    }
                },
                "arguments": [
                    {
                        "type": "Literal",
                        "value": "HERE",
                        "raw": "\"HERE\""
                    }
                ]
            }
        };
    }
});

parser.extendSyntax({
	type: 'statement',
	name: "linelog2",
	parser: function() {
		parser.parseEndOfStatement();
		return 'console.log("Here, too"); let x = 12; console.log(x)';
	}
});

parser.extendSyntax({
	type: 'statement',
	name: "linelog3",
	parser: function() {
		var expr = parser.parseExpression();
		parser.parseEndOfStatement();
        var tmp = "somestring";
		return statement {console.log("Here, too"); let x = @expr; console.log(x, @tmp)};
	}
});

parser.extendSyntax({
    type: 'statement',
    name: 'statemachine',
    parser: function() {
        var name = parser.parseIdentifier();
        parser.tokenizer.expect('{');
        parser.tokenizer.expect('}');
        var x = {type: 'Identifier', name: parser.importAlias(module)};
        return statement {var @name = new @x.Statemachine()}
    }
});