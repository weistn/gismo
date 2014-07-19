import "gismo/metaprogramming"
import "gismo/template"

var counter = 0;

function transformRule(parser, grammar, trule) {
	for(var i = 0; i < trule.branches.length; i++) {
		var b = trule.branches[i];
		for(var k = 0; k < b.syntax.length; k++) {
			var s = b.syntax[k];
			var sname = s.name;
//			if (!s.name) {
//				s.name = "__n" + k.toString();
//			}
			if (s.type === "Branch") {
				var name = "__" + (counter++).toString();
				var rule = {name: name, branches: [s.branch]};
				grammar.rules[rule.name] = rule;
				s = b.syntax[k] = {type: "Rule", name: s.name, ruleName: rule.name, repeat: s.repeat};
				transformRule(parser, grammar, rule);
			}
			if (!s.repeat) {
				continue;
			}
			switch (s.repeat) {
				case "ZeroOrOne":
					var name = "__" + (counter++).toString();
					var branch1 = {syntax:[b.syntax[k]]};
					branch1.action = template { return @({type: "Identifier", name: b.syntax[k].name}) };
					var branch2 = {syntax:[]};
					var rule = {name: name, branches: [branch1, branch2]};
					grammar.rules[rule.name] = rule;
					b.syntax[k] = {type: "Rule", name: sname, ruleName: rule.name};
					break;
				case "ZeroOrMore":
					var name = "__" + (counter++).toString();
					var branch1 = {syntax:[b.syntax[k], {type: "Rule", ruleName: name, name: "__n1"}]};
					branch1.syntax[0].name = "__n0";
					branch1.action = template{
						if (__n1) {
							return [__n0].concat(__n1);
						} else {
							return [__n0];
						}
					};
					var branch2 = {syntax:[]};
					var rule = {name: name, branches: [branch1, branch2]};
					grammar.rules[rule.name] = rule;
					b.syntax[k] = {type: "Rule", name: sname, ruleName: rule.name};
					break;
				case "OneOrMore":
					var name = "__" + (counter++).toString();
					var name2 = "__" + (counter++).toString();
					var branch1 = {syntax:[b.syntax[k], {type: "Rule", ruleName: name2, name: "__n1"}]};
					branch1.syntax[0].name = "__n0";
					branch1.action = template{
						if (__n1) {
							return [__n0].concat(__n1);
						} else {
							return [__n0];
						}
					};
					var rule = {name: name, branches: [branch1]};
					grammar.rules[rule.name] = rule;

					branch1 = {syntax:[b.syntax[k], {type: "Rule", ruleName: name2, name: "__n1"}]};
					branch1.syntax[0].name = "__n0";
					branch1.action = template{
						if (__n1) {
							return [__n0].concat(__n1);
						} else {
							return [__n0];
						}
					};
					var branch2 = {syntax:[]};
					var rule2 = {name: name2, branches: [branch1, branch2]};
					grammar.rules[rule2.name] = rule2;
					b.syntax[k] = {type: "Rule", name: sname, ruleName: rule.name};
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
					case "Term":
					case "Expression":
					case "Statement":
					case "EndOfStatement":
					case "StatementOrBlockStatement":
						lh["All"] = true;
						break;
					case "BlockStatement":
						lh["\\{"] = true;
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
				case "Term":
				case "Expression":
				case "Statement":
				case "EndOfStatement":
				case "BlockStatement":
				case "StatementOrBlockStatement":
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
				case "Term":
				case "Expression":
				case "Statement":
				case "EndOfStatement":
				case "BlockStatement":
				case "StatementOrBlockStatement":
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
	parser.tokenizer.storeContext();
	parser.tokenizer.registerKeyword("rule");
	parser.tokenizer.registerKeyword("keyword");
	parser.tokenizer.registerKeyword("punctuator");

	var grammarName = parser.tokenizer.expectIdentifier();
	parser.tokenizer.expect('{');

	var grammar = {rules: {}, keywords:[], punctuators:[]};
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
		if (t.type === "Keyword" && t.value === 'keyword') {
			parser.tokenizer.next();
			var keyword = parser.tokenizer.expectIdentifier();
			parser.parseEndOfStatement();
			grammar.keywords.push(keyword.value);
			continue;
		}
		if (t.type === "Keyword" && t.value === 'punctuator') {
			parser.tokenizer.next();
			var punctuator = parser.tokenizer.expectPunctuator();
			parser.parseEndOfStatement();
			grammar.punctuators.push(punctuator.value);
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

	var gname = {type: "Identifier", name: grammarName.value};

	var main = template {
		function @gname() {
		}
	};
	main.loc = grammarName.loc;

	// Generate code for all rules
	var funcs = [];
	for(var key in grammar.rules) {
		// Each rule has a function that applies it
		var r = grammar.rules[key];
		var name = {type: "Identifier", name: r.name};
		var rfunc = template(
			function(parser) {
			}
		);
		rfunc.loc = grammarName.loc;
		funcs.push(template{ @gname.prototype.@name = @rfunc });

		// If there is more than one rule, we must look ahead to determine which branch to use.
		if (r.branches.length > 1) {
			var nolookahead = false;
			var lcode = [template{ var __l = parser.tokenizer.lookahead(); }];
			for(var k = 0; k < r.branches.length; k++) {
				if (nolookahead) {
					parser.throwError(r, "Rule has unreachable branches");
				}
				var b = r.branches[k];
				var lh = branchLookahead(parser, grammar, b);
				var bname = {type: "Identifier", name: "__b" + k.toString() + "__" + r.name};
				var expr = null, e;
				for( var lhkey in lh) {
					switch(lhkey) {
						case "Empty":
							nolookahead = true;
							break;
						case "All":
							e = template(__l.type !== @({type: "Literal", value: "EOF"}));
							break;
						case "Numeric":
						case "String":
						case "Boolean":
						case "Identifier":
						case "Punctuator":
							e = template(__l.type === @({type: "Literal", value: lhkey}));
							break;
						case "RegularExpression":
							e = template(__l.type === "Punctuator" && __l.value === "/");
							break;
						default:
							e = template(__l.type !== "String" && __l.value === @({type: "Literal", value: lhkey.slice(1)}));
							break;
					}
					if (expr) {
						expr = template(@expr || @e);
					} else {
						expr = e;
					}
				}
				if (expr && !nolookahead) {
					lcode.push(template{ if (__l && @expr) return this.@bname(parser) });
				} else {
					lcode.push(template{ return this.@bname(parser) });
				}
			}
			if (!nolookahead) {
				lcode.push(template{ parser.throwError(__l, "Unexpected token %0", __l.value) });
			}
			rfunc.body.body = rfunc.body.body.concat(lcode);
		}

		// Generate code for all branches of the rule
		for(var k = 0; k < r.branches.length; k++) {
			var b = r.branches[k];
			// If a rule has more than one branch, generate a function for each branch
			if (r.branches.length > 1) {
				var bname = {type: "Identifier", name: "__b" + k.toString() + "__" + r.name};
				var bfunc = template(
					function(parser) {
					}
				);
				bfunc.loc = grammarName.loc;
				funcs.push(template {@gname.prototype.@bname = @bfunc});
			} else {
				// One branch only. The code for the branch goes directly into the rule function
				var bfunc = rfunc;
			}

			bfunc.body.body.push(template { var ast = {}; });

			// Parse all tokens inside a rule
			var tokenNames = [];
			for(var j = 0; j < b.syntax.length; j++) {
				var s = b.syntax[j];
				var n = {type: "Identifier", name: s.name};
				if (s.name) {
					tokenNames.push(n);
				}
				var code;
				switch(s.type) {
					case "Rule":
						var rn = {type: "Identifier", name: s.ruleName};
						// Builtin rule
						switch (s.ruleName) {
							case "Numeric":
								if (s.name ) {
									code = template{
										ast.@n = parser.tokenizer.expectNumber();
									}
								} else {
									code = template{
										parser.tokenizer.expectNumber();
									}
								}
								break;
							case "String":
								if (s.name) {
									code = template{
										ast.@n = parser.tokenizer.expectString();
									}
								} else {
									code = template{
										parser.tokenizer.expectString();
									}
								}
								break;
							case "Boolean":
								if (s.name) {
									code = template{
										ast.@n = parser.tokenizer.expectBoolean();
									}
								} else {
									code = template{
										parser.tokenizer.expectBoolean();
									}
								}
								break;
							case "RegularExpression":
								if (s.name) {
									code = template{
										parser.tokenizer.expect('/');
										ast.@n = parser.tokenizer.expectRegExp();
									}
								} else {
									code = template{
										parser.tokenizer.expect('/');
										parser.tokenizer.expectRegExp();
									}
								}
								break;
							case "Identifier":
								if (s.name) {
									code = template{
										ast.@n = parser.tokenizer.expectIdentifier();
									}
								} else {
									code = template{
										parser.tokenizer.expectIdentifier();
									}
								}
								break;
							case "Punctuator":
								if (s.name) {
									code = template{
										ast.@n = parser.tokenizer.expectPunctuator();
									}
								} else {
									code = template{
										parser.tokenizer.expectPunctuator();
									}
								}
								break;
							case "Term":
								if (s.name) {
									code = template{
										ast.@n = parser.parseTerm();
									}
								} else {
									code = template{
										parser.parseTerm();
									}
								}
								break;
							case "Expression":
								if (s.name) {
									code = template{
										ast.@n = parser.parseExpression();
									}
								} else {
									code = template{
										parser.parseExpression();
									}
								}
								break;
							case "Statement":
								if (s.name) {
									code = template{
										ast.@n = parser.parseStatement();
									}
								} else {
									code = template{
										parser.parseStatement();
									}
								}
								break;
							case "EndOfStatement":
								parser.parseEndOfStatement();
								break;
							case "BlockStatement":
								if (s.name) {
									code = template{
										ast.@n = parser.parseBlockStatement();
									}
								} else {
									code = template{
										parser.parseBlockStatement();
									}
								}
								break;
							case "StatementOrBlockStatement":
								if (s.name) {
									code = template{
										ast.@n = parser.parseStatementOrBlockStatement();
									}
								} else {
									code = template{
										parser.parseStatementOrBlockStatement();
									}
								}
								break;
							default:
								if (s.name) {
									code = template{
										ast.@n = this.@rn(parser);
									}
								} else {
									code = template{
										this.@rn(parser);
									}
								}
								break;
						}
						break;
					case "Identifier":
					case "Punctuator":
						if (s.name) {
							code = template{
								ast.@n = parser.tokenizer.expect(@(s.token.value));
							}
						} else {
							code = template{
								parser.tokenizer.expect(@(s.token.value));
							}
						}
						break;
					default:
						throw new Error("Implementation error");
				}
				bfunc.body.body = bfunc.body.body.concat(code);
			}

			// Add the action code to the end of the branch.
			// Or return the last token if no action is specified.
			if (b.action) {
				var afunc = template( function(@tokenNames) { } );
				afunc.log = grammarName.loc;
				if (b.action.type === "BlockStatement") {
					afunc.body.body = afunc.body.body.concat(b.action.body);
				} else {
					afunc.body.body = afunc.body.body.concat(b.action);
				}
				var n = {type: "Identifier", name: "__" + (counter++).toString()};
				funcs.push(template{ @gname.@n = @afunc });
				var args = [];
				for(var x = 0; x < tokenNames.length; x++) {
					args.push( template( ast.@(tokenNames[x])) );
				}
				bfunc.body.body = bfunc.body.body.concat( template{ return @gname.@n(@args); });
			} else {
				if (b.syntax.length === 0) {
					bfunc.body.body = bfunc.body.body.concat( template{ return null; } );
				} else {
					bfunc.body.body = bfunc.body.body.concat( template{ return ast; } );
				}
			}
		}

		if (r.name === "start" && (grammar.keywords.length !== 0 || grammar.punctuators.length !== 0)) {
			for(var i = 0; i < grammar.keywords.length; i++) {
				var lit = {type: "Literal", value: grammar.keywords[i]};
				rfunc.body.body.unshift(template { parser.tokenizer.registerKeyword(@lit)});
			}
			for(var i = 0; i < grammar.punctuators.length; i++) {
				var lit = {type: "Literal", value: grammar.punctuators[i]};
				rfunc.body.body.unshift(template { parser.tokenizer.registerPunctuator(@lit)});
			}
			rfunc.body.body.unshift(template{ parser.tokenizer.storeContext() });
			rfunc.body.body.push(template{ parser.tokenizer.restoreContext() });
		}
	}

	parser.tokenizer.restoreContext();

	return [main].concat(funcs);
}
