import "gismo/metaprogramming"
import "gismo/template"

var counter = 0;

function transformRule(parser, grammar, rule) {
	for(var i = 0; i < rule.branches.length; i++) {
		var b = rule.branches[i];
		for(var k = 0; k < b.syntax.length; k++) {
			var s = b.syntax[k];
			if (!s.name) {
				s.name = "__n" + k.toString();
			}
			if (!s.repeat) {
				continue;
			}
			console.log(rule.name);
			switch (s.repeat) {
				case "ZeroOrOne":
					var name = "__" + (counter++).toString();
					var branch1;
					if (s.type === "Branch") {
						branch1 = {syntax: s.branch.syntax.slice(0)};
					} else {
						branch1 = {syntax:[b.syntax[k]]};
					}
					var branch2 = {syntax:[]};
					var rule = {name: name, branches: [branch1, branch2]};
					grammar.rules[rule.name] = rule;
					b.syntax[k] = {type: "Rule", name: s.name, ruleName: rule.name};
					break;
				case "ZeroOrMore":
					var name = "__" + (counter++).toString();
					var branch1;
					if (s.type === "Branch") {
						branch1 = {syntax: s.branch.syntax.slice(0)};
					} else {
						branch1 = {syntax:[b.syntax[k]]};
					}
					branch1.synax = branch1.syntax.concat({type: "Rule", ruleName: name});
					var branch2 = {syntax:[]};
					var rule = {name: name, branches: [branch1, branch2]};
					grammar.rules[rule.name] = rule;
					b.syntax[k] = {type: "Rule", name: s.name, ruleName: rule.name};
					break;
				case "OneOrMore":
					var name = "__" + (counter++).toString();
					var name2 = "__" + (counter++).toString();
					var branch1;
					if (s.type === "Branch") {
						branch1 = {syntax: s.branch.syntax.slice(0)};
					} else {
						branch1 = {syntax:[b.syntax[k]]};
					}
					branch1.synax = branch1.syntax.concat({type: "Rule", ruleName: name2});
					branch1.action = template{
						if (__n1) {
							return [__n0].concat(__n1);
						} else {
							return [_n0];
						}
					};
					var rule = {name: name, branches: [branch1]};
					grammar.rules[rule.name] = rule;
					b.syntax[k] = {type: "Rule", name: s.name, ruleName: rule.name};

					if (s.type === "Branch") {
						branch1 = {syntax: s.branch.syntax.slice(0)};
					} else {
						branch1 = {syntax:[b.syntax[k]]};
					}
					branch1.synax = branch1.syntax.concat({type: "Rule", ruleName: name});
					branch1.action = template{
						if (__n1) {
							return [__n0].concat(__n1);
						} else {
							return [_n0];
						}
					};
					var branch2 = {syntax:[]};
					var rule = {name: name2, branches: [branch1, branch2]};
					grammar.rules[rule.name] = rule;
					b.syntax[k] = {type: "Rule", name: s.name, ruleName: rule.name};
					break;
			}
		}
	}
}

function branchLookahead(parser, grammar, b) {
	var lh = {};
	if (b.syntax.length === 0) {
		lh["Empty"] = true;
	} else {
		switch(b.syntax[0].type) {
			case "Rule":
				switch (b.syntax[0].ruleName) {
					case "Numeric":
					case "String":
					case "Boolean":
					case "RegularExpression":
					case "Identifier":
					case "Punctuator":
						lh[b.syntax[0].ruleName] = true;
						break;
					default:
						var lh2 = ruleLookahead(parser, grammar, grammar.rules[b.syntax[0].ruleName]);
						for(var key in lh2) {
							lh[key] = lh2[key];
						}
						break;
				}
				break;
			case "Identifier":
			case "Punctuator":
				lh["\\" + b.syntax[0].token.value] = true;
				break;
			default:
				throw new Error("Implementation error");
		}
	}
	return lh;
}

function ruleLookahead(parser, grammar, rule) {
	var lh = {};
	for(var i = 0; i < rule.branches.length; i++) {
		var b = rule.branches[i];
		var lh2 = branchLookahead(parser, grammar, b);
		for(var key in lh2) {
			lh[key] = lh2[key];
		}
	}
	return lh;
}

function checkBranchReachability(parser, grammar, b) {
	for(var k = 0; k < b.syntax.length; k++) {
		var s = b.syntax[k];
		if(s.type === "Rule") {
			switch (s.ruleName) {
				case "Numeric":
				case "String":
				case "Boolean":
				case "RegularExpression":
				case "Identifier":
				case "Punctuator":
					// Built-in rules
					break;
				default:
					checkReachability(parser, grammar, grammar.rules[s.ruleName]);
					break;
			}
		} else if(s.type === "Branch") {
			checkBranchReachability(parser, grammar, s.branch);
		}
	}
}

function checkReachability(parser, grammar, rule) {
	if (rule.__reachable) {
		return;
	}
//	rule.__visit = true;
	rule.__reachable = true;
	for(var i = 0; i < rule.branches.length; i++) {
		var b = rule.branches[i];
		checkBranchReachability(parser, grammar, b);
	}
//	delete rule.__visit;
}

function checkBranch(parser, grammar, b) {
	for(var i = 0; i < b.syntax.length; i++) {
		var s = b.syntax[i];
		if(s.type === "Rule") {
			switch (s.ruleName) {
				case "Numeric":
				case "String":
				case "Boolean":
				case "RegularExpression":
				case "Identifier":
				case "Punctuator":
					// Built-in rules
					break;
				default:
					if (!grammar.rules[s.ruleName]) {
						parser.throwError(s.ruleToken, "The rule '%0' has not been defined", s.ruleName);
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
				branch.syntax.push({type: "Branch", branch: b, name: nameToken ? nameToken.value : null});
			} else {
				break;
			}
		} else if (t.type === "Identifier") {
			parser.tokenizer.next();
			if (parser.tokenizer.presume(':', true)) {
				nameToken = t;
				continue;
			}
			branch.syntax.push({type: "Rule", ruleName: t.value, name: nameToken ? nameToken.value : null});
		} else if (t.type === "String") {
			parser.tokenizer.next();
			if (parser.tokenizer.isIdentifier(t.value)) {
				branch.syntax.push({type: "Identifier", token: t, name: nameToken ? nameToken.value : null});
			} else if (parser.tokenizer.isPunctuator(t.value)) {
				branch.syntax.push({type: "Punctuator", token: t, name: nameToken ? nameToken.value : null});
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
			branch.syntax[branch.syntax.length - 1].repeat = "ZeroOrMore";
		} else if (parser.tokenizer.presume('+', true)) {
			branch.syntax[branch.syntax.length - 1].repeat = "OneOrMore";
		} else if (parser.tokenizer.presume('?', true)) {
			branch.syntax[branch.syntax.length - 1].repeat = "ZeroOrOne";
		}
		nameToken = null;
	}
	if (t && t.type === "Punctuator" && t.value === '{') {
		branch.action = parser.parseBlockStatement();
	}
	return branch;
}

function parseRule(parser) {
	var ruleName = parser.tokenizer.expectIdentifier();
	var rule = {name: ruleName.value, loc: ruleName.loc, branches: []};
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

	var grammarName = parser.tokenizer.expectIdentifier();
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

	// All rules must be reachable
	checkReachability(parser, grammar, grammar.rules.start);
	for(var key in grammar.rules) {
		var r = grammar.rules[key];
		if (!r.__reachable) {
			parser.throwError(rule, "Rule '%0' is not reachable", r.name);
		}
	}

	var userRules = [];
	for(var key in grammar.rules) {
		var r = grammar.rules[key];
		userRules.push(r);
	}
	for(var i = 0; i < userRules.length; i++) {
		transformRule(parser, grammar, userRules[i]);
	}

	console.log(ruleLookahead(parser, grammar, grammar.rules.start));

	// TODO: Unregister the rule keyword

	var gname = {type: "Identifier", name: grammarName.value};

	var main = template {
		function @gname(parser) {

		}
	};

	var funcs = [];
	for(var key in grammar.rules) {
		var r = grammar.rules[key];
		var name = {type: "Identifier", name: r.name};
		var rfunc = template(
			function(parser) {
			}
		);
		funcs.push(template{ @gname.prototype.@name = @rfunc });

		for(var k = 0; k < r.branches.length; k++) {
			var b = r.branches[k];
			if (r.branches.length > 1) {
				var bname = {type: "Identifier", name: "__b" + k.toString() + "__" + r.name};
				var bfunc = template(
					function(parser) {
					}
				);
				funcs.push(template {@gname.prototype.@bname = @bfunc});
			} else {
				var bfunc = rfunc;
			}

			for(var j = 0; j < b.syntax.length; j++) {
				var s = b.syntax[j];
				var n = {type: "Identifier", name: s.name};
				var code;
				switch(s.type) {
					case "Rule":
						var rn = {type: "Identifier", name: s.ruleName};
						// TODO: builtin rule
						switch (s.ruleName) {
							case "Numeric":
								break;
							case "String":
								break;
							case "Boolean":
								break;
							case "RegularExpression":
								break;
							case "Identifier":
								code = template{
									var @n = parser.tokenizer.expectIdentifier();
								}
								break;
							case "Punctuator":
								break;
							default:
								code = template{
									var @n = this.@rn(parser);
								}
								break;
						}
						break;
					case "Identifier":
					case "Punctuator":
						code = template{
							var @n = parser.expect(@(s.token.value));
						}
						break;
				}
				bfunc.body.body = bfunc.body.body.concat(code);
			}

			if (b.action) {
				if (b.action.type === "BlockStatement") {
					bfunc.body.body = bfunc.body.body.concat(b.action.body);
				} else {
					bfunc.body.body = bfunc.body.body.concat(b.action);
				}
			} else {
				if (b.syntax.length === 0) {
					bfunc.body.body = bfunc.body.body.concat( template{ return null; } );
				} else {
					var n = {type: "Identifier", name: b.syntax[b.syntax.length - 1].name};
					bfunc.body.body = bfunc.body.body.concat( template{ return @n; } );
				}
				// TODO
			}
		}
	}
	return [main].concat(funcs);
}
