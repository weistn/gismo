var esprima = require('esprima');

function foo() {
	var tokens = esprima.tokenize("while(true) {1+2; return !x}; throw throw a", {loc: true});
//	var tokens = esprima.tokenize("5 * 6\n2+3\n var a = x,\nb = y\nreturn a\nvar b", {loc: true});
//	var tokens = esprima.tokenize("while(a<5){print(a)}", {loc: true});
//	var tokens = esprima.tokenize("for(a=0;a<4;a++){print(a)}", { });
//	var tokens = esprima.tokenize("return a; return; {return a+b}; {return}; {typeof a+b}; {return (a;b;c;break)}", { });
//	var tokens = esprima.tokenize("return a; return; {return}", { });
//	var tokens = esprima.tokenize("a.b.c()", { });
//	var tokens = esprima.tokenize("new a; new a.x; new x.y(); new (u.v); new (a.b)(); new a.b()(12)", { });
//	var tokens = esprima.tokenize("new a; new x.a; new x.y(); new (x.y)()", { });
//	var tokens = esprima.tokenize("return a(12)[13].foo(); var a, b = 12, c", { });
//	var tokens = esprima.tokenize("(a = 0; b; c) + - -a", { });
//	var tokens = esprima.tokenize("a = function hudel(a,b) { x + y } - 3", { });
//	var tokens = esprima.tokenize("a = () * 3", { });
//	var tokens = esprima.tokenize("a = b", { });
//	var tokens = esprima.tokenize("a + (x=4) + () + (a,b,c) + [1,2]", { });
//	var tokens = esprima.tokenize("a + 3 + x", { });
//	var tokens = esprima.tokenize("a = b = c", { });
//	var tokens = esprima.tokenize("a + -x * +b++--", { });
	console.log(tokens);
	var toks = new tokenizer(tokens);
	var parsed = parseTopLevelStatements(toks);
	console.log(JSON.stringify(parsed, null, '\t'));

	return 42;
}

	// Parses until EOF
var Mode_Default = 0,
	// Parses an expression up to the point where the next symbol cannot be added to the expression any more.
	Mode_Expression = 1,
	// TODO: Must get a different number
	Mode_Statement = 2,
	// Parses an expression, but stops at call operation. Required when parsing "new ... ()"" since "..." must not contain
	// a function call at top-level.
	Mode_ExpressionWithoutCall = 3,
	// Parses a bracket expression, i.e. '(...)'
	Mode_Bracket = 4;

function tokenizer(tokens) {
	this.index = 0;
	this.stack = [];
	this.tokens = tokens;
}

tokenizer.prototype.next = function() {
	if (this.index === this.tokens.length) {
		return undefined;
	}
	return this.tokens[this.index++];
};

tokenizer.prototype.lookahead = function() {
	if (this.index === this.tokens.length) {
		return undefined;
	}
	return this.tokens[this.index];
};

tokenizer.prototype.save = function() {
	this.stack.push(this.index);
};

tokenizer.prototype.restore = function() {
	this.index = this.stack.pop();
};

tokenizer.prototype.unsave = function() {
	this.stack.pop();
};

tokenizer.prototype.presume = function(tokenValue, consume) {
	var t = this.lookahead();
	if (t && t.value === tokenValue) {
		if (consume) {
			this.index++;
		}
		return t;
	}
	return undefined;
};

tokenizer.prototype.presumeIdentifier = function(consume) {
	var t = this.lookahead();
	if (t && t.type === "Identifier") {
		if (consume) {
			this.index++;
		}
		return t;
	}
};

tokenizer.prototype.expect = function(tokenValue, errorMsg) {
	var t = this.next();
	if (t && t.value === tokenValue) {
		return t;
	}
	if (errorMsg) {
		throw errorMsg;
	}	
	throw "Expected " + tokenValue + " but got " + (t ? t.value : " EOF");
};

tokenizer.prototype.expectLookahead = function(tokenValue, errorMsg) {
	var t = this.lookahead();
	if (t && t.value === tokenValue) {
		return t;
	}
	if (errorMsg) {
		throw errorMsg;
	}	
	throw "Expected " + tokenValue + " but got " + (t ? t.value : " EOF");
};

function functionParser(tokenizer) {
	var name = tokenizer.presumeIdentifier(true);
	tokenizer.expectLookahead("(");
	var parameters = parse(tokenizer, Mode_Bracket);
	tokenizer.expectLookahead("{");
	var code = parse(tokenizer, Mode_Bracket);
	return {
		type: "FunctionDeclaration",
		params: parameters,
		body: code,
		id: name
	};
}

function forParser(tokenizer) {
	tokenizer.expectLookahead("(");
	var args = parse(tokenizer, Mode_Bracket);
	if (typeof (args.content) !== "object" || typeof(args.content.left) !== "object" || args.content.op !== ";" || args.content.left.length !== 3) {
		throw "Malformed 'for' statement";
	}
	var code = parseStatement(tokenizer);
//	tokenizer.expectLookahead("{");
//	var code = parse(tokenizer, Mode_Bracket);
	return {
		type: "ForStatement",
		init: args.content.left[0],
		test: args.content.left[1],
		update: args.content.left[2],
		body: code
	};
}

function whileParser(tokenizer) {
	tokenizer.expectLookahead("(");
	var args = parse(tokenizer, Mode_Bracket);
	if (args.content === undefined) {
		throw "SyntaxError: Unexpected token ')'";
	}
	var code = parseStatement(tokenizer);
//	tokenizer.expectLookahead("{");
//	var code = parse(tokenizer, Mode_Bracket);
	return {
		type: "WhileStatement",
		test: args.content,
		body: code
	};
}

function newParser(tokenizer) {
	var clas = parse(tokenizer, Mode_ExpressionWithoutCall);
	var arguments = undefined;
	var t = tokenizer.presume("(", false);
	if (t !== undefined) {
		arguments = parse(tokenizer, Mode_Bracket);
	}
	return {
		type: "NewExpression",
		callee: clas,
		arguments: arguments
	};
}

function returnParser(tokenizer) {
	var left = parse(tokenizer, Mode_Expression);
	return {
		type: "ReturnStatement",
		argument: left
	};
}

function throwParser(tokenizer) {
	var left = parse(tokenizer, Mode_Expression);
	return {
		type: "ThrowStatement",
		expression: left
	};
}

var operatorPrecedence = [
	[{
		type: 'Punctuator',
		value: ";",
		associativity: "br",
		collapse: true
	}],
	[{
		type: 'Keyword',
		value: "var",
		associativity: "ur"
//		statement: true
	},
	{
		type: 'Keyword',
		value: "throw",
		associativity: "none",
		parser: throwParser
	},
	{
		type: 'Keyword',
		value: "return",
		associativity: "none",
		parser: returnParser
	},	
	{
		type: 'Keyword',
		value: "for",
		associativity: "none",
		statement: true,
		parser: forParser
	},	
	{
		type: 'Keyword',
		value: "while",
		associativity: "none",
		statement: true,
		parser: whileParser
	},	
	{
		type: 'Keyword',
		value: "break",
		associativity: "none"
	},	
	{
		type: 'Keyword',
		value: "continue",
		associativity: "none"
	}],
	[{
		type: 'Punctuator',
		value: ",",
		associativity: "br",
		collapse: true
	}],
	[{
		type: 'Punctuator',
		value: "=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "+=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "-=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "*=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "/=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "&=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "<<=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: ">>=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: ">>>=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "&=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "|=",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: "^=",
		associativity: "br"
	}],
	[{
		type: 'Keyword',
		value: "yield",
		associativity: "ur"
	}],
	[{
		type: 'Punctuator',
		value: "?",
		associativity: "br"
	},
	{
		type: 'Punctuator',
		value: ":",
		associativity: "br"
	}],
	[{
		type: 'Punctuator',
		value: "||",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "&&",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "|",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "^",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "&",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "==",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "!=",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "===",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "!==",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "<",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: ">",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "<=",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: ">=",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "in",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "instanceof",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: ">>",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "<<",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: ">>>",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "+",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "-",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "*",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "/",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		value: "%",
		associativity: "bl"
	}],
	[{
		type: 'Punctuator',
		value: "+",
		associativity: "ur"
	},
	{
		type: 'Punctuator',
		value: "-",
		associativity: "ur"
	},
	{
		type: 'Punctuator',
		value: "!",
		associativity: "ur"
	},
	{
		type: 'Punctuator',
		value: "!",
		associativity: "ur"
	},
	{
		type: 'Punctuator',
		value: "delete",
		associativity: "ur"
	},
	{
		type: 'Punctuator',
		value: "typeof",
		associativity: "ur"
	},
	{
		type: 'Punctuator',
		value: "void",
		associativity: "ur"
	}],
	[{
		type: 'Punctuator',
		value: "++",
		associativity: "ul"
	},
	{
		type: 'Punctuator',
		value: "--",
		associativity: "ul"
	}],
	[{
		type: 'Punctuator',
		value: ".",
		associativity: "bl"
	},
	{
		type: 'Punctuator',
		associativity: "ul",
		bracket: true,
		value: "(",
		correspondingBracket: ")"
	},
	{
		type: 'Punctuator',
		associativity: "ul",
		closingBracket: true,
		value: ")"
	},
	{
		type: 'Punctuator',
		associativity: "ul",
		bracket: true,
		value: "[",
		correspondingBracket: "]"
	},
	{
		type: 'Punctuator',
		associativity: "ul",
		closingBracket: true,
		value: "]"
	}],
	[{
		type: 'Identifier',
		associativity: "none"
	},
	{
		type: 'Numeric',
		associativity: "none"
	},
	{
		type: 'Keyword',
		associativity: "none",
		value: "true"
	},
	{
		type: 'Keyword',
		associativity: "none",
		value: "false"
	},
	{
		type: 'Keyword',
		associativity: "none",
		value: "null"
	},
	{
		type: 'Keyword',
		value: "new",
		associativity: "none",
		parser: newParser
	},
	{
		type: 'Keyword',
		value: "this",
		associativity: "none"
	},
	{
		type: 'Keyword',
		value: "function",
		associativity: "none",
		parser: functionParser
	},
	{
		type: 'Punctuator',
		associativity: "none",
		bracket: true,
		value: "(",
		correspondingBracket: ")"
	},
	{
		type: 'Punctuator',
		associativity: "none",
		bracket: true,
		value: "[",
		correspondingBracket: "]"
	},
	{
		type: 'Punctuator',
		associativity: "none",
		bracket: true,
		value: "{",
		correspondingBracket: "}"
	}]
];

var operators = { };
var numericTerminal;
var identifierTerminal;
var programOperator = {
	type: "Program",
	associativity: "ur",
	value: "program",
	level: -1
};
var closingRoundBracketOperator = {
	type: "Punctuator",
	associativity: "none",
	value: ")",
	closingBracket: true,
	level: -1
};
var closingCurlyBracketOperator = {
	type: "Punctuator",
	associativity: "none",
	value: "}",
	closingBracket: true,
	level: -1
};
var closingSquareBracketOperator = {
	type: "Punctuator",
	associativity: "none",
	value: "]",
	closingBracket: true,
	level: -1
};

for(var i = 0; i < operatorPrecedence.length; i++) {
	var ops = operatorPrecedence[i];
	for(var j = 0; j < ops.length; j++) {
		ops[j].level = i;
		if (ops[j].type === "Identifier") {
			identifierTerminal = ops[j];
			continue;
		}
		if (ops[j].type === "Numeric") {
			numericTerminal = ops[j];
			continue;
		}
		if (operators[ops[j].value] !== undefined) {
			operators[ops[j].value].push(ops[j]);
		} else {
			operators[ops[j].value] = [ops[j]];
		}
	}
}

function findOperatorDownwards(token, level) {
	if (token.type === "Identifier") {
		return identifierTerminal;
	}
	if (token.type === "Numeric") {
		return numericTerminal;
	}
	if (token.value === ")") {
		return closingRoundBracketOperator;
	}
	if (token.value === "]") {
		return closingSquareBracketOperator;
	}
	if (token.value === "}") {
		return closingCurlyBracketOperator;
	}
	var op;
	var ops = operators[token.value];
	for(var i = 0; i < ops.length; i++) {
		if (ops[i].level >= level && (!op || ops[i].level < op.level) && (ops[i].associativity === "ur" || ops[i].associativity === "none")) {
			op = ops[i];
		}
	}
	return op;
}

function findOperatorUpwards(token, level) {
	if (token.value === ")") {
		return closingRoundBracketOperator;
	}
	if (token.value === "]") {
		return closingSquareBracketOperator;
	}
	if (token.value === "}") {
		return closingCurlyBracketOperator;
	}
	var op;
	var ops = operators[token.value];
	if (ops === undefined) {
		return undefined;
	}
	for(var i = 0; i < ops.length; i++) {
		if (ops[i].level <= level && (!op || ops[i].level > op.level) && (ops[i].associativity === "bl" || ops[i].associativity === "br" || ops[i].associativity === "ul" || ops[i].closingBracket)) {
			op = ops[i];
		}
	}
	return op;
}

function finishRecursions(level, stack, value, lookahead) {
	while(stack.length > 0 && stack[stack.length - 1].op.level >= level && !stack[stack.length - 1].op.bracket) {
		state = stack.pop()
//		console.log(state.op.value, "... upwards to level", level, " value=", value);
		if (value === undefined && state.op !== programOperator) {
			if (lookahead !== undefined) {
				throw "SyntaxError: Unexpected token '" + lookahead.value + "'";				
			}
			throw "Unexpected end of expression";
		}
		if (state.op.associativity === "ur") {
			state.value.right = value;
		} else if (state.op.associativity === "bl") {
			state.value.right = value;
		} else if (state.op.associativity === "br") {
			if (state.op.collapse) {
				if (typeof value === "object" && value.op === state.op.value) {
					state.value.left = [state.value.left].concat(value.left);
				} else {
					state.value.left = [state.value.left, value];
				}
			} else {
				state.value.right = value;
			}
		} else {
			throw "Internal Error: Unknown state in upward recursion";
		}
//		console.log("      value changes from", value, "to", state.value);
		value = state.value;
	}
	return value;
};

function parse(toks, mode) {
	var stack = [];
	var value;
	var state = {op: programOperator};
	var token = {value: "program", loc: {start: {line: 0}, end: {line: 0}}};
	var bracketCount = 0;
	var tryColon = false;
	var enforceColon = false;

	do {
		// Process the current token (token[index]) with the current operator (state.op)
		if (state.op.parser) {
			console.log(token.value, "parser");
			value = state.op.parser(toks);
		} else if (state.op.bracket && state.op.associativity === "none") {
			console.log(token.value, "bracket");
			state.value = {operator: state.op.value};
			stack.push(state);
			value = undefined;
			bracketCount++;
		} else if (state.op.bracket && state.op.associativity === "ul") {
			console.log(token.value, "post-bracket");
			state.value = {operator: state.op.value, left: value};
			stack.push(state);
			value = undefined;
			bracketCount++;
		} else if (state.op.closingBracket) {
			console.log(token.value, "closing_bracket");
			value = finishRecursions(-1 ,stack, value, state.op.value);
			if (stack.length === 0 || stack[stack.length - 1].op.correspondingBracket !== state.op.value) {
				throw "Unexpected closing bracket '" + state.op.value + "'";
			}
			stack[stack.length - 1].value.content = value;
			value = stack[stack.length - 1].value;
			bracketCount--;
		} else if (state.op.associativity === "none") {
			console.log(token.value, "terminal");
			if (state.op.nodeType) {
				value = {type: state.op.nodeType};
			} else {
				value = {type: "Literal", raw: token.value, value: token.value === "true" ? true : (token.value === "false" ? false : (token.value === "null" ? null : (token.type === "Identifier" ? token.value : parseFloat(token.value))))};				
			}
		} else if (state.op.associativity === "ul") {
			console.log(token.value, "ul");
			value = {operator: state.op.value, left: value, prefix: false, type: "UnaryExpression"};
		} else if (state.op.associativity === "ur") {
			console.log(token.value, "ur");
			if (state.op.nodeType) {
				state.value = {type: state.op.nodeType};
			} else {
				state.value = {operator: state.op.value, prefix: true, type: "UnaryExpression"};
			}
			stack.push(state);
			value = undefined;
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			console.log(token.value, "bl or br");	
			state.value = {operator: state.op.value, left: value, type: "BinaryExpression"};
			stack.push(state);
			value = undefined;
		} else {
			throw "Internal Error: Unknown state in loop";
		}

		// Determine the next operator based on the next token (if there is any)
		var lookahead = toks.lookahead();

		// Reached EOF?
		if (lookahead === undefined) {
			if (state.op.closingBracket) {	
				stack.pop();
			}
			break;
		}

		if (state.op.closingBracket) {
			var state = stack.pop();
			if (mode === Mode_Bracket && stack.length === 1) {
				value = finishRecursions(-1, stack, value, lookahead);
				return value.right;
			}
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				tryColon = true;
			} else {
				value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
				state = {op: op};
			}
		} else if (state.op.bracket) {
			var op = findOperatorDownwards(lookahead, 0);
			if (!op) {
				break;
			}
			state = {op: op};
			value = undefined;
		} else if (state.op.associativity === "none") {
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				if (state.op.statement) {
					enforceColon = true;
				} else {
					tryColon = true;
				}
			} else {
				value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
				state = {op: op};
			}
		} else if (state.op.associativity === "ul") {
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				tryColon = true;
			} else {
				value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
				state = {op: op};
			}
		} else if (state.op.associativity === "ur") {
			value = undefined;
			var op = findOperatorDownwards(lookahead, state.op.level);
			if (!op) {
				break;
			}
			state = {op: op};
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			var op = findOperatorDownwards(lookahead, state.op.level + 1);
			if (!op) {
				break;
			}
			state = {op: op};
			value = undefined;
		} else {
			throw "Internal Error: Unknown state in loop";
		}

		if (tryColon || enforceColon) {
			// The token and the lookahead must reside on different lines. Otherwise colon insertion is not allowed
			if (tryColon && token.loc.end.line === lookahead.loc.start.line) {
				throw "SyntaxError: Unexpected token '" + lookahead.value + "'";
			}
			lookahead = {
				type: "Punctuator",
				value: ";",
				loc: token.loc
			};
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				throw "Internal Error: Could not find colon";
			}
			value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value);
			state = {op: op};
		}

		if (mode === Mode_Statement && lookahead.value === ";" && bracketCount === 0) {
			toks.next();
			break;
		}
		if ((mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) && lookahead.value === ";" && bracketCount === 0) {
			break;
		}
		if ((mode === Mode_Statement || mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) && state.op.closingBracket && bracketCount === 0) {
			break;
		}
		if (mode === Mode_ExpressionWithoutCall && state.op.value === "(" && state.op.associativity === "ul" && bracketCount === 0) {
			break;
		}

		// If a colon has been inserted, do not consume another token from the tokenizer
		if (tryColon || enforceColon) {
			token = lookahead;
			tryColon = false;
			enforceColon = false;
		} else {
			token = toks.next()
		}
	} while(true);

	// Finish all recursions upwards
	value = finishRecursions(-1, stack, value, lookahead);
	if (stack.length > 0) {
		if (toks.lookahead() === undefined) {
			throw "Unexpected end of file";
		}
		throw "Unexpected symbol '" + toks.lookahead().value + "'";
	}
	if (mode === Mode_Default && toks.lookahead() !== undefined) {
		throw "Unexpected symbol '" + toks.lookahead().value + "'";
	}
	return value.right;
}

function parseStatement(toks) {
	var result;
	var lookahead = toks.lookahead();
	if (lookahead !== undefined && lookahead.value === "{") {
		var body = parse(toks, Mode_Bracket);
		if (body.content === undefined) {
			body = [];
		} if (body.content.operator === ";") {
			body = body.content.left;
		} else {
			body = [body.content];
		}
		for(var i = 0; i < body.length; i++) {
			if (body[i].type.length < 9 || body[i].type.substr(body[i].type.length - 9, 9) !== "Statement") {
				body[i] = { type: "ExpressionStatement", expression: body[i]};
			}
		}
		result = {type: "BlockStatement", body: body};
	} else {
		var body = parse(toks, Mode_Statement);
		if (body.type.length < 9 || body.type.substr(body.type.length - 9, 9) !== "Statement") {
			result = { type: "ExpressionStatement", expression: body};
		} else {
			result = body;
		}
	}
	return result;
}

function parseTopLevelStatements(toks) {
	var result = { type: "Program", body: []};
	while( toks.lookahead() !== undefined) {
		var body = parseStatement(toks);
		if (body.type.length < 9 || body.type.substr(body.type.length - 9, 9) !== "Statement") {
			body = { type: "ExpressionStatement", expression: body};
		}
		result.body.push(body);
	}
	return result;
}

exports.foo = foo;
