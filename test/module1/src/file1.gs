console.log("Hello Gismo, from module1");
console.log(linepos);

exports.toAST = function(obj) {
	console.log("toAST: ", JSON.stringify(obj));
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