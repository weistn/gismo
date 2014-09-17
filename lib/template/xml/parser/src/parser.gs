import "gismo/grammar"

grammar xmlFragment {
	rule start
		= c:content* { return c; }

	rule content
		= t:tag { return t; }
		| txt:text { return txt; }

	rule text
		= "&" e:entity ";" { return e; }
		| t:[^&<{}]+ { return {type: "Text", value: t}; }

	rule entity
		= i:Identifier { return {type: "Entity", value: i}; }
		| "#" e:entityNumber { return e; }

	rule entityNumber
		= "x" n:[0123456789abcdef]+ { return {type: "Entity", value: parseInt(n, 16)}; }
		| n:[0123456789]+ { return {type: "Entity", value: parseInt(n)}; }

	rule tag
		= "<" name:Identifier attr:attribute* ">" content:tagContent* "<" "/" name2:Identifier ">" { return {type: "Tag", attributes: attr, content: content}; }

	rule tagContent
		= t:tag { return t; }
		| txt:text { return txt; }

	rule attribute
		= name:Identifier "=" value:String { return {type: "Attribute", name: name, value: value}; }
}

export function parseFragment(parser) {
	var g = new xmlFragment();
	var ast = g.parse(parser);

	return ast;
}