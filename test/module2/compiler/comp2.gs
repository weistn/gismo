import 'module1'

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

		return statement {console.log("Here, too"); let x = @expr; console.log(x)};
	}
});
