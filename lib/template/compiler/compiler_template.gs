
export parser.extendSyntax({
	type: 'operator',
	associativity: "none",
	name: "@",
	level: 18,
	generator: function() {
		var content = parser.parseTerm();
		return {
			type: "Identifier",
			name: "@",
			content: content,
			loc: content.loc
		};
	}
});

// 'obj' is an array of AST nodes
function arrayExpressionFromObject(obj) {
	var elements = [];
	for(var i = 0; i < obj.length; i++) {
		var value = objectExpressionFromObject(obj[i]);
		elements.push(value);
	}
	return {
		type: "ArrayExpression",
		elements: elements
	}
}

// 'obj' is an AST node. It returns another AST that, when executed, returns an AST equivalent to 'obj'.
// The only difference between 'obj' and the result of executing the returned AST is that the returned
// AST substituted all occurrences of '@'.
function objectExpressionFromObject(obj) {
	// Turn "@(expr)" into "expr"
	if (typeof obj === "object" && obj.type === "Identifier" && obj.name === "@") {
        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toAST"
                }
            },
            "arguments": [
            	obj.content
            ]
        };
	}
	// Turn "{ ...; @(expr); ... }" into { ... ; expr; ... }
	if (typeof obj === "object" && obj.type === "ExpressionStatement" && typeof obj.expression === "object" && obj.expression.type === "Identifier" && obj.expression.name === "@") {
        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toStatement"
                }
            },
            "arguments": [
            	obj.expression.content
            ]
        };
	}

	var props = [];
	for(var key in obj) {
		if (key === "loc") {
			continue;
		}
		var value = obj[key];
		switch (typeof value) {
			case "object":
				if (value !== null) {
					if (obj.type === "BlockStatement" && key === "body") {
						var special = false;
						for(var i = 0; i < value.length; i++) {
							var v = value[i];
							if (typeof v === "object" && v.type === "ExpressionStatement" && typeof v.expression === "object" && v.expression.type === "Identifier" && v.expression.name === "@") {
								special = true;
							}
						}
						if (special) {
							var tmp = {
		                        "type": "CallExpression",
		                        "callee": {
		                            "type": "MemberExpression",
		                            "computed": false,
		                            "object": {
		                                "type": "Identifier",
		                                "name": parser.importAlias(module)
		                            },
		                            "property": {
		                                "type": "Identifier",
		                                "name": "toBlockStatementBody"
		                            }
		                        },
		                        "arguments": [ ]
							};
							for(var i = 0; i < value.length; i++) {
								var v = value[i];
								tmp.arguments.push(objectExpressionFromObject(v));
							}
							value = tmp;
						} else {
							value = arrayExpressionFromObject(value);
						}
						break;
				    } else if ((obj.type === "FunctionDeclaration" || obj.type === "FunctionExpression") && key === "params") {
						// Handle "function(@params)"
						var params = [];
						var special = false;
						for(var i = 0; i < value.length; i++) {
							var v = value[i];
							if (typeof v === "object" && v.type === "Identifier" && v.name === "@") {
								special = true;
								params.push(v.content);
							} else {
								params.push(objectExpressionFromObject(v));
							}
						}
						if (special) {
							value = {
					            "type": "CallExpression",
					            "callee": {
					                "type": "MemberExpression",
					                "computed": false,
					                "object": {
					                    "type": "Identifier",
					                    "name": parser.importAlias(module)
					                },
					                "property": {
					                    "type": "Identifier",
					                    "name": "toFunctionParameters"
					                }
					            },
					            "arguments": params
					        };
					        break;
						}
					// Handle "f(@args)"
					} else if (obj.type === "CallExpression" && key === "arguments") {
						var args = [];
						var special = false;
						for(var i = 0; i < value.length; i++) {
							var v = value[i];
							if (typeof v === "object" && v.type === "Identifier" && v.name === "@") {
								special = true;
								args = args.concat(v.content);
							} else {
								args = args.concat(objectExpressionFromObject(v));
							}
						}
//						console.log(JSON.stringify(arguments));
						if (special) {
							value = {
					            "type": "CallExpression",
					            "callee": {
					                "type": "MemberExpression",
					                "computed": false,
					                "object": {
					                    "type": "Identifier",
					                    "name": parser.importAlias(module)
					                },
					                "property": {
					                    "type": "Identifier",
					                    "name": "toFunctionArguments"
					                }
					            },
					            "arguments": args
					        };
					        break;
						}
					}
					if (value.length === undefined) {
						value = objectExpressionFromObject(value);
					} else {
						value = arrayExpressionFromObject(value);
					}
					break;
				}
			case "number":
			case "string":
			case "boolean":
				value = {
					type: "Literal",
					value: value
				};
				break;
			default:
				throw "Implementation Error: key=" + key + ", typeof value=" + typeof value + " obj=" + JSON.stringify(obj);
		}
		props.push({
            "type": "Property",
            "key": {
                "type": "Literal",
                "value": key
            },
            "value": value,
            "kind": "init"
		});
	}
	return {
		"type": "ObjectExpression",
        "properties": props
	}
};

export parser.extendSyntax({
	type: 'operator',
	associativity: 'none',
	level: 18,
	name: "template",
	generator: function() {
		if (parser.tokenizer.presume('(', false)) {
			return objectExpressionFromObject(parser.parseTerm());
		}
		var s = parser.parseBlockStatement();
		if (s.body.length === 1 ) {
			return objectExpressionFromObject(s.body[0]);
		}
		return arrayExpressionFromObject(s.body);
	}
});

export parser.extendSyntax({
	type: 'operator',
	associativity: 'none',
	level: 18,
	name: "identifier",
	generator: function() {
		return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toIdentifier"
                }
            },
            "arguments": [parser.parseExpression()]
        };
	}
});

export parser.extendSyntax({
	type: 'operator',
	associativity: 'none',
	level: 18,
	name: "literal",
	generator: function() {
		return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toLiteral"
                }
            },
            "arguments": [parser.parseExpression()]
        };
	}
});
