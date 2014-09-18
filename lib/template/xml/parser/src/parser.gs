import "gismo/grammar"

grammar xmlFragment {
	punctuator "</"
	punctuator "&#"
	punctuator "&#x"

	rule start
		= c:content* { return c; }

	rule content
		= t:tag { return t; }
		| txt:text { return txt; }

	rule text
		= "&" i:Identifier ";" { return {type: "Entity", value: i.name}; }
		| "&#" n:[0123456789]+ ";" { return {type: "Entity", value: parseInt(n)}; }
		| "&#x" n:[0123456789abcdef]+ ";" { return {type: "Entity", value: parseInt(n, 16)}; }
		| "{" expr:Expression "}" { return {type: "Code", expr:expr}; }
		| t:[^&<{}]+ { return {type: "Text", value: t}; }

	rule tag
		= "<" name:Identifier attr:attribute* end:tagEnd { end.nodeName = name; end.attributes = attr; return end; }

	rule tagEnd
		= ">" content:tagContent* "</" name2:Identifier ">" { return {type: "Element", content: content}; }
		| "/" ">" { return {type: "Element", content: null}; }

	rule tagContent
		= t:tag { return t; }
		| txt:text { return txt; }

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