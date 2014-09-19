import "gismo/template"
import "gismo/metaprogramming"
import "gismo/template/xml/parser" as xmlparser

var counter = 0;

export operator xmlTemplate {
	parser.tokenizer.expect("{");
	var ast = xmlparser.parseFragment(parser);
	parser.tokenizer.expect("}");

	if (ast === null) {
		return template(null);
	}

	var code = [ template{ var __parent = document.createDocumentFragment(), __node, $data; } ];
//	console.log(JSON.stringify(ast, null, "\t"));
	counter = 0;
	generateContent(code, ast);
	code.push(template{ return __parent; })

	return template((function(){@code})());
}

function generateContent(code, ast) {
	for(var i = 0; i < ast.length; i++) {
		var a = ast[i];
		switch (a.type) {
			case "Element":
				code.push(template{ __node = document.createElement(@(literal a.nodeName.name)) });
				if (a.attributes) {
					for(var j = 0; j < a.attributes.length; j++) {
						var attr = a.attributes[j];
						if (attr.value.type === "Code") {
							code.push(template{ __node.setAttribute(@(literal attr.name.name), @(attr.value.expr)); });
						} else {
							code.push(template{ __node.setAttribute(@(literal attr.name.name), @(literal attr.value.value)); });
						}
					}
				}
				if (a.content) {
					code.push(template{ __parent = __node; })
					generateContent(code, a.content);					
					code.push(template{ __parent = __parent.parentNode; })
				} else {
					code.push(template{ __parent.appendChild(__node); });
				}
				break;
			case "Text":
				code.push(template{ __node = document.createTextNode(@(literal a.value)); });
				code.push(template{ __parent.appendChild(__node); });
				break;
			case "Code":
				code.push(template{ __node = @(identifier parser.importAlias(module)).objectToNode(document, @(a.expr)); });
				code.push(template{ if (__node) __parent.appendChild(__node); });
				break;
			case "Foreach":
				var content = [];
				var arrname = identifier "__arr_" + (counter).toString();
				var arrlength = identifier "__arrlen_" + (counter).toString();
				var itname = identifier "__it_" + (counter++).toString();
				generateContent(content, a.content);
				code.push(template{ var @arrname = @(a.expr); });
				code.push(template{ var @arrlength = @arrname.length; });
				code.push(template{ for (var @itname = 0; @itname < @arrlength; @itname++ ) {
					$data = @arrname[@itname];
					@content
				}});
				break;
			case "If":
				var content = [];
				generateContent(content, a.content);
				code.push(template{ if (@(a.expr)) {
					@content
				}});
				break;
		}
	}
}

