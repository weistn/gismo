// import "x/foobar.js" as bar

runat compile {
	parser.extendSyntax({
		type: 'operand',
		name: 'linepos',
		parser: function() {
			return {
				type: "Literal",
				value: "NEW OPERAND"
			};
		}
	});

	parser.extendSyntax({
		type: 'operator',
		name: "@",
		level: 16,
		associativity: "right",
		generator: function(arg) {
			return {
				type: "Literal",
				value: "@",
				content: arg,
				loc: arg.loc
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
		if (obj.type === "Literal" && obj.value === "@") {
			return obj.content;
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
					throw "Implementation Error: " + typeof value;
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
		type: 'operand',
		name: "statement",
		parser: function() {
			return objectExpressionFromObject(parser.parseBlockStatement());
		}
	});
}

runat compile {
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
}


console.log('Hello World')
linelog
linelog2
linelog3 "Doedel" + "Hudel"
var a = linepos
console.log('Ende')
