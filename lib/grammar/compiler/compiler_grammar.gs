import "gismo/metaprogramming"
import "gismo/template"

function checkBranch(parser, grammar, b) {
	for(var i = 0; i < b.syntax.length; i++) {
		var s = b.syntax[i];
		if(s.type === "Rule") {
			switch (s.ruleToken.value) {
				case "Numeric":
				case "String":
				case "Boolean":
				case "RegularExpression":
				case "Identifier":
				case "Punctuator":
					// Built-in rules
					break;
				default:
					if (!grammar.rules[s.ruleToken.value]) {
						parser.throwError(s.ruleToken, "The rule '%0' has not been defined", s.ruleToken.value);
					}
			}
		} else if (s.type === "Branch") {
			checkBranch(parser, grammar, s.branch);
		}
	}
}

function parseRuleBranch(parser) {
	var branch = {syntax: []};
	var t;
	var nameToken;
	while(true) {
		t = parser.tokenizer.lookahead();
		if (!t || t.type === "Keyword") {
			break;
		}
		if (t.type === "Punctuator") {
			if (t.value === "(") {
				parser.tokenizer.next();
				var b = parseRuleBranch(parser);
				parser.tokenizer.expect(")");
				branch.syntax.push({type: "Branch", branch: b, nameToken: nameToken});
			} else {
				break;
			}
		} else if (t.type === "Identifier") {
			parser.tokenizer.next();
			if (parser.tokenizer.presume(':', true)) {
				nameToken = t;
				continue;
			}
			branch.syntax.push({type: "Rule", ruleToken: t, nameToken: nameToken});
		} else if (t.type === "String") {
			parser.tokenizer.next();
			if (parser.tokenizer.isIdentifier(t.value)) {
				branch.syntax.push({type: "Identifier", token: t, nameToken: nameToken});
			} else if (parser.tokenizer.isPunctuator(t.value)) {
				branch.syntax.push({type: "Punctuator", token: t, nameToken: nameToken});
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
		if (parser.tokenizer.presume('*', true)) {
			branch.syntax[branch.syntax.length - 1].repeatZeroOrMore = true;
		} else if (parser.tokenizer.presume('+', true)) {
			branch.syntax[branch.syntax.length - 1].repeatOnceOrMore = true;			
		} else if (parser.tokenizer.presume('?', true)) {
			branch.syntax[branch.syntax.length - 1].repeatZeroOrOnce = true;
		}
		nameToken = null;
	}
	if (t && t.type === "Punctuator" && t.value === '{') {
		parser.parseBlockStatement();
	}
	return branch;
}

function parseRule(parser) {
	var ruleName = parser.parseIdentifier();
	var rule = {name: ruleName.name, loc: ruleName.loc, branches: [], nameToken: ruleName};	
	var t = parser.tokenizer.expect('=');
	rule.branches.push(parseRuleBranch(parser));
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

	// Every grammar must have a start rule
	if (!grammar.rules.start) {
		parser.throwError(name, "Grammar is missing a start rule");
	}

	// All mentioned rules must exist
	for(var key in grammar.rules) {
		var r = grammar.rules[key];
		for(var k = 0; k < r.branches.length; k++) {
			checkBranch(parser, grammar, r.branches[k]);
		}
	}

	// TODO: Unregister the rule keyword

	var main = template {
		function @name(parser) {

		}
	};

	var funcs = [];
	for(var key in grammar.rules) {
		var r = grammar.rules[key];
		funcs.push(template{
			@name.prototype.@(r.nameToken) = function() {

			}
		})
	}
	return [main].concat(funcs);
}
