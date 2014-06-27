console.log("Compiler code of module1, here called", parser.importAlias(module));

parser.extendSyntax({
	exports: true,
	type: "operand",
	name: "linepos",
	parser: function() {
		return {
			type: "Literal",
			value: "NEW OPERAND"
		};
	}	 
});

parser.extendSyntax({
	exports: true,
	type: 'operand',
	name: "@",
	parser: function() {
		var content = parser.parseTerm();
		return {
			type: "Identifier",
			name: "@",
			content: content,
			loc: content.loc
		};
	}
});

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

function objectExpressionFromObject(obj) {
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
					if ((obj.type === "FunctionDeclaration" || obj.type === "FunctionExpression") && key === "params") {
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

parser.extendSyntax({
	exports: true,
	type: 'operand',
	name: "statement",
	parser: function() {
		return objectExpressionFromObject(parser.parseBlockStatement());
	}
});

