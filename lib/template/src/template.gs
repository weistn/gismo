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
		if (typeof params === "object" && params.length !== undefined) {
			for(var i = 0; i < params.length; i++) {
				result.push(toIdentifier(params[i]))
			}
		} else {
			result.push(toIdentifier(params));
		}
	}
	return result;
};

exports.toFunctionArguments = function() {
	var result = [];
	for(var a = 0; a < arguments.length; a++) {
		var arg = arguments[a];
		if (typeof arg === "object" && arg.length !== undefined) {
			for(var i = 0; i < arg.length; i++) {
				result.push(exports.toAST(arg[i]));
			}
		} else {
			result.push(exports.toAST(arg));
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
			default:
				if (expr.length !== undefined) {
					// TODO: This block statement should be joined with an outer block statement (if possible)
					return {
						type: "BlockStatement",
						body: expr
					};
				}
		}
	}
	return {
		type: "ExpressionStatement",
		expression: exports.toAST(expr)
	};
};
