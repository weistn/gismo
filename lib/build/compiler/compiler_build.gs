import "gismo/metaprogramming"
import "escodegen"

export operator resource {
	parser.tokenizer.expect("(");
	var name = parser.tokenizer.expectString();
	parser.tokenizer.expect(")");

	return {
		type: "Literal",
		value: parser.getCompiler().getPackage().gismo.uniqueId + "-" + name.value
	};
}

function evalAST(ast) {
//	var program = {type: "Program", body: [{
//		type: "ExpressionStatement",
//		expression: ast
//	}]};

    var result = escodegen.generate(ast).toString();
//    console.log("EXEC", result, JSON.stringify(parser.compiler.options, null, "\t"));
	var ret = !!eval("(" + result + ")");
//	console.log("RET", ret);
	return ret;
}

export statement ifdef {
	var result;
	parser.tokenizer.expect("(");
	var expr = parser.parseExpression(parser.Mode_Expression);
	parser.tokenizer.expect(")");
	var block = parser.parseBlockStatement();
	if (evalAST(expr)) {
		result = block;
	}
	while(true) {
		if (parser.tokenizer.presume("else", true)) {
			if (parser.tokenizer.presume("if", true)) {
				parser.tokenizer.expect("(");
				var expr = parser.parseExpression(parser.Mode_Expression);
				parser.tokenizer.expect(")");
				var block = parser.parseBlockStatement();
				if (!result && evalAST(expr)) {
					result = block;
				}
			} else {
				var block = parser.parseBlockStatement();
				if (!result) {
					result = block;
				}
				break;
			}
		} else {
			break;
		}
	}
	if (!result) {
		return {
			type: "EmptyStatement"
		};
	}
	return result.body;
}