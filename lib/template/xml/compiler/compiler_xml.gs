import "gismo/template"
import "gismo/metaprogramming"
import "gismo/template/xml/parser" as xmlparser

var counter = 0;

export operator xmlTemplate {
	parser.tokenizer.expect("(");

	// Parse parameters
	var args = [];
	var arg = parser.tokenizer.presumeIdentifier(true);
	while(arg) {
		args.push(arg.value);
		if (!parser.tokenizer.presume(",", true)) {
			break;
		}
		arg = parser.tokenizer.expectIdentifier();
	}
	args.push(identifier "__doc");

	parser.tokenizer.expect(")");
	parser.tokenizer.expect("{");
	var ast = xmlparser.parseFragment(parser);
	parser.tokenizer.expect("}");

	if (ast === null) {
		return template(null);
	}

	var code = [ 
		template{ if (!__doc) {
			__doc = new @(identifier parser.importAlias(module)).xmldom.Document();
		}},
		template{ var __parent = __doc.createDocumentFragment(), __node, $data; }
	];
//	console.log(JSON.stringify(ast, null, "\t"));
	counter = 0;
	generateContent(code, ast);
	code.push(template{ return __parent; })

	return template(function(@args){@code});
}

function generateContent(code, ast) {
	for(var i = 0; i < ast.length; i++) {
		var a = ast[i];
		switch (a.type) {
			case "Element":
				code.push(template{ __node = __doc.createElement(@(literal a.nodeName.name)) });
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
					code.push(template{ __parent.appendChild(__node); });
					code.push(template{ __parent = __node; })
					generateContent(code, a.content);					
					code.push(template{ __parent = __parent.parentNode; });
				} else {
					code.push(template{ __parent.appendChild(__node); });
				}
				break;
			case "Text":
				if ((i === 0 || i + 1 === ast.length) && a.value.trim() === "") {
					continue;
				}
				code.push(template{ __node = __doc.createTextNode(@(literal a.value)); });
				code.push(template{ __parent.appendChild(__node); });
				break;
			case "Code":
				code.push(template{ __node = @(identifier parser.importAlias(module)).objectToNode(__doc, @(a.expr)); });
				code.push(template{ if (__node) __parent.appendChild(__node); });
				break;
			case "Foreach":
				var content = [];
				var arrname = identifier "__arr_" + (counter).toString();
				var arrlength = identifier "__arrlen_" + (counter).toString();
				var itname = identifier "__it_" + (counter++).toString();
				var tmpname = identifier "__tmp_" + (counter++).toString();
				generateContent(content, a.content);
				code.push(template{ var @tmpname = $data; });
				code.push(template{ var @arrname = @(a.expr); });
				code.push(template{ var @arrlength = @arrname.length; });
				code.push(template{ for (var @itname = 0; @itname < @arrlength; @itname++ ) {
					$data = @arrname[@itname];
					@content
				}});
				code.push(template{ $data = @tmpname; });
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

