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
	if (obj.type === "Identifier" && obj.name === "@") {
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
				throw "Implementation Error: key=" + key + ", typeof value=" + typeof value;
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
