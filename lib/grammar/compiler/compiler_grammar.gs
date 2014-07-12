import "gismo/metaprogramming"
import "gismo/template"

function parseRuleBranch(parser) {
	var branch = {};
	var t;
	while(true) {
		t = parser.tokenizer.lookahead();
		if (!t || t.type === "Punctuator" || t.type === "Keyword") {
			break;
		}
		if (t.type === "Identifier") {
			parser.tokenizer.next();
			if (parser.tokenizer.presume(':', true)) {
				var t2 = parser.parseIdentifier();
			}
		} else if (t.type === "String") {
			parser.tokenizer.next();
			if (parser.tokenizer.isIdentifier(t.value)) {

			} else if (parser.tokenizer.isPunctuator(t.value)) {

			} else {
				parser.throwError(t, "''%0' is neither a valid identifier nor a valid punctuator", t.value);
			}
		} else {
			if (!t) {
				parser.throwError(t, "Unexpected end of file");
			} else {
				parser.throwError(t, "Unexpected token %0", t.value);
			}
		}
	}
	if (t && t.type === "Punctuator" && t.value === '{') {
		parser.parseBlockStatement();
	}
	return branch;
}

function parseRule(parser) {
	var ruleName = parser.parseIdentifier();
	var rule = {name: ruleName.name, loc: ruleName.loc, branches: []};	
	var t = parser.tokenizer.expect('=');
	parseRuleBranch(parser);
	var t = parser.tokenizer.lookahead();
	while(t && t.type === "Punctuator" && t.value === '|') {
		parser.tokenizer.next();
		var branch = parseRuleBranch(parser);
		rule.branches.push(branch);		
		var t = parser.tokenizer.lookahead();
	}
	return rule;
}

export statement grammar {
	parser.tokenizer.registerKeyword("rule");

	var name = parser.parseIdentifier();
	parser.tokenizer.expect('{');

	var grammar = {rules: {}};
	while(true) {
		var t = parser.tokenizer.lookahead();
		if (!t) {
			break;
		}
		if (t.type === "Punctuator" && t.value === '}') {
			break;
		}
		if (t.type === "Keyword" && t.value === 'rule') {
			parser.tokenizer.next();
			var rule = parseRule(parser);
			if (grammar.rules[rule.name]) {
				parser.throwError(t, "Rule %0 has already been defined", rule.name);
			}
			grammar.rules[rule.name] = rule;
			continue;
		}
		parser.throwError(t, "Unexpected token %0", t.value);
	}

	parser.tokenizer.expect('}');

	// TODO: Unregister the rule keyword

	return template {
		function @name(parser) {

		}
	};
}

/*
rule start
  = additive

additive
  = left:multiplicative "+" right:additive { return left + right; }
  / multiplicative

multiplicative
  = left:primary "*" right:multiplicative { return left * right; }
  / primary

primary
  = integer
  / "(" additive:additive ")" { return additive; }

integer "integer"
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }
*/