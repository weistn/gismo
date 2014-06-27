console.log("Hello Gismo, from module1");
console.log(linepos);

exports.toAST = function(obj) {
	switch(typeof obj) {
		case "object":
			if (obj !== null) {
				if (!obj.type) {
					throw new Error("toAST expects objects to be AST objects: " + JSON.stringify(obj));
				}
				return obj;
			}
			return {
				type: "Literal",
				value: null
			};
		case "number":
		case "string":
		case "boolean":
			return {
				type: "Literal",
				value: obj
			};
		case "undefined":
			return {
				type: "Identifier",
				name: "undefined"
			}
		default:
			throw "Implementation Error: key=" + key + ", typeof value=" + typeof value;
	}
};

function toIdentifier(ident) {
	if (typeof ident === "object") {
		if (!ident.type) {
			throw new Error("Expect object to be an AST object: " + JSON.stringify(ident));
		}
		return ident;
	}
	if (typeof ident === "string") {
		return {type: "Identifier", name: ident};
	}
	throw new Error("Expect object to be an AST object or string: " + JSON.stringify(ident));
}

exports.toFunctionParameters = function() {
	var result = [];
	for(var a = 0; a < arguments.length; a++) {
		var params = arguments[a];
		if (params.length !== undefined) {
			for(var i = 0; i < params.length; i++) {
				result.push(toIdentifier(params[i]))
			}
		} else {
			result.push(toIdentifier(params));
		}
	}
	return result;
};

exports.toStatement = function(expr) {
	if (typeof expr === "object") {
		switch (expr.type) {
			case "BlockStatement":
			case "ExpressionStatement":
			case "FunctionDeclaration":
			case "ForStatement":
			case "ForInStatement":
			case "WhileStatement":
			case "IfStatement":
			case "SwitchStatement":
			case "BreakStatement":
			case "ContinueStatement":
			case "ReturnStatement":
			case "ThrowStatement":
			case "VariableDeclaration":
			case "DoWhileStatement":
			case "ThrowStatement":
			case "TryStatement":
			case "DebuggerStatement":
				return expr;
		}
	}
	return {
		type: "ExpressionStatement",
		expression: expr
	};
};
