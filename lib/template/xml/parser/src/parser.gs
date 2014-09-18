import "gismo/grammar"

grammar xmlFragment {
	punctuator "</"
	punctuator "&#"
	punctuator "&#x"
	punctuator "&quot;"
	punctuator "&amp;"
	punctuator "&apos;"
	punctuator "&lt;"
	punctuator "&gt;"

	rule start
		= c:content* { return c; }

	rule content
		= t:tag { return t; }
		| "{" expr:Expression "}"  { return {type: "Code", expr:expr}; }
		| txt:text { return txt; }

	rule text
		= "&quot;" m:text? { return {type: "Text", value: m ? '"' + m.value : '"'}; }
		| "&amp;" m:text? { return {type: "Text", value: m ? "'" + m.value : "'"}; }
		| "&apos;" m:text? { return {type: "Text", value: m ? '&' + m.value : '&'}; }
		| "&lt;" m:text? { return {type: "Text", value: m ? '<' + m.value : '<'}; }
		| "&gt;" m:text? { return {type: "Text", value: m ? '>' + m.value : '>'}; }
		| "&#" n:[0123456789]+ ";" m:text? { return {type: "Text", value: m ? String.fromCharCode(parseInt(n)) + m.value : String.fromCharCode(parseInt(n)) }; }
		| "&#x" n:[0123456789abcdef]+ ";" m:text? { return {type: "Text", value: m ? String.fromCharCode(parseInt(n, 16)) + m.value : String.fromCharCode(parseInt(n, 16)) }; }
		| t:[^&<{}]+ m:text? { return {type: "Text", value: t}; }

	rule tag
		= "<" name:Identifier attr:attribute* end:tagEnd { end.nodeName = name; end.attributes = attr; return end; }

	rule tagEnd
		= ">" content:content* "</" name2:Identifier ">" { return {type: "Element", content: content}; }
		| "/" ">" { return {type: "Element", content: null}; }

	rule attribute
		= name:Identifier "=" value:attributeValue { return {type: "Attribute", name: name, value: value}; }

	rule attributeValue
		= value:String { return value; }
		| "{" code:Expression "}" { return {type: "Code", expr: code}; }
}

export function parseFragment(parser) {
	var g = new xmlFragment();
	var ast = g.start(parser);

	return ast;
}