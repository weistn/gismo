import "gismo/metaprogramming"
import "gismo/template/xml/parser" as xmlparser

export operator xmlTemplate {
	parser.tokenizer.expect("{");
	var ast = xmlparser.parseFragment(parser);
	parser.tokenizer.expect("}");

	var str = JSON.stringify(ast);
	return {type: "Literal", value: str};
}

