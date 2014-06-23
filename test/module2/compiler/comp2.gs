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

		return statement {console.log("Here, too"); let x = @expr; console.log(x)};
	}
});

parser.extendSyntax({
    type: 'statement',
    name: 'statemachine',
    parser: function() {
        var name = parser.tokenizer.expectIdentifier();
        parser.tokenizer.expect('{');
        parser.tokenizer.expect('}');

        return {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": name.value,
                        "loc": name.loc
                    },
                    "init": {
                        "type": "NewExpression",
                        "callee": {
                            "type": "MemberExpression",
                            "computed": false,
                            "object": {
                                "type": "Identifier",
                                "name": parser.importAlias(module)
                            },
                            "property": {
                                "type": "Identifier",
                                "name": "Statemachine"
                            }
                        },
                        "arguments": []
                    }
                }
            ],
            "kind": "var"
        };


//        var x = {type: 'Identifier', name: name.value, loc: name.loc};
//        console.log("X=",x);
//        return statement {let foo = @x;}
//        return statement {var @(name.value) = new @(parser.importAlias()).Statemachine(); }
    }
});