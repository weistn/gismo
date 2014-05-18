var esprima = require('esprima');

function foo() {
	console.log("Hallo Welt");
	var tokens = esprima.tokenize("return a; return; {return a+b}; {return}; {typeof a+b}; {return (a;b;c)}", { });

//	var tokens = esprima.tokenize("return", { });

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
	var parsed = parse(toks);
	console.log(JSON.stringify(parsed, null, '\t'));

	return 42;
}

	// Parses until EOF
var Mode_Default = 0,
	// Parses an expression up to the point where the next symbol cannot be added to the expression any more.
	Mode_Expression = 1,
	// Parses an expression, but stops at call operation. Required when parsing "new ... ()"" since "..." must not contain
	// a function call at top-level.
	Mode_ExpressionWithoutCall = 2,
	// Parses a bracket expression, i.e. '(...)'
	Mode_Bracket = 3;

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
		type: "Function",
		parameters: parameters,
		code: code,
		name: name
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
		type: "New",
		clas: clas,
		arguments: arguments
	};
}

function returnParser(tokenizer) {
	var left = parse(tokenizer, Mode_Expression);
	return {
		type: "Return",
		left: left
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
	},
	{
		type: 'Keyword',
		value: "throw",
		associativity: "ur"
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
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "+=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "-=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "*=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "/=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "&=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "<<=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: ">>=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: ">>>=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "&=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "|=",
		associativity: "br",
		collapse: true
	},
	{
		type: 'Punctuator',
		value: "^=",
		associativity: "br",
		collapse: true
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
		associativity: "none",
		terminal: true
	},
	{
		type: 'Numeric',
		associativity: "none",
		terminal: true
	},
	{
		type: 'Keyword',
		value: "new",
		associativity: "none",
		parser: newParser
	},
	{
		type: 'Keyword',
		value: "function",
		associativity: "none",
		parser: functionParser
	},
	{
		type: 'Keyword',
		value: "return",
		associativity: "none",
		parser: returnParser
	},	
	{
		type: 'Keyword',
		value: "break",
		associativity: "none",
		terminal: true
	},	
	{
		type: 'Keyword',
		value: "continue",
		associativity: "none",
		terminal: true
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
		closingBracket: true,
		value: ")"
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
		closingBracket: true,
		value: "]"
	},
	{
		type: 'Punctuator',
		associativity: "none",
		bracket: true,
		value: "{",
		correspondingBracket: "}"
	},
	{
		type: 'Punctuator',
		associativity: "none",
		closingBracket: true,
		value: "}"
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

for(var i = 0; i < operatorPrecedence.length; i++) {
	var ops = operatorPrecedence[i];
	for(var j = 0; j < ops.length; j++) {
		ops[j].level = i;
		if (ops[j].terminal) {
			if (ops[j].type === "Identifier") {
				identifierTerminal = ops[j];
				continue;
			}
			if (ops[j].type === "Numeric") {
				numericTerminal = ops[j];
				continue;
			}
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
	var op;
	var ops = operators[token.value];
	for(var i = 0; i < ops.length; i++) {
		if (ops[i].level >= level && (!op || ops[i].level < op.level) && (ops[i].associativity === "ur" || ops[i].associativity === "none")) {
			op = ops[i];
		}
	}
//	if (!op) {
//		console.log("NO SUCH OP downwards", token.value, level);
//		return undefined;
//	}
	return op;
}

function findOperatorUpwards(token, level) {
	var op;
	var ops = operators[token.value];
	for(var i = 0; i < ops.length; i++) {
		if (ops[i].level <= level && (!op || ops[i].level > op.level) && (ops[i].associativity === "bl" || ops[i].associativity === "br" || ops[i].associativity === "ul" || ops[i].closingBracket)) {
			op = ops[i];
		}
	}
	return op;
}

function finishRecursions(level, stack, value) {
	while(stack.length > 0 && stack[stack.length - 1].op.level >= level && !stack[stack.length - 1].op.bracket) {
		state = stack.pop()
		console.log(state.op.value, "... upwards to level", level, " value=", value);
		if (value === undefined && state.op !== programOperator) {
			console.log("State is", state);
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
			throw "Unknown state in upward recursion";
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
	var token = {value: "program"};
	var bracketCount = 0;

	do {
		// Process the current token (token[index]) with the current operator (state.op)
		if (state.op.parser) {
			console.log(token.value, "parser");
			value = state.op.parser(toks);
		} else if (state.op.terminal) {
			console.log(token.value, "terminal");
			value = token;
		} else if (state.op.bracket && state.op.associativity === "none") {
			console.log(token.value, "bracket");
			state.value = {op: state.op.value};
			stack.push(state);
			value = undefined;
			bracketCount++;
		} else if (state.op.bracket && state.op.associativity === "ul") {
			console.log(token.value, "post-bracket");
			state.value = {op: state.op.value, left: value};
			stack.push(state);
			value = undefined;
			bracketCount++;
		} else if (state.op.closingBracket) {
			console.log(token.value, "closing_bracket");
			value = finishRecursions(-1 ,stack, value);
			if (stack.length === 0 || stack[stack.length - 1].op.correspondingBracket !== state.op.value) {
				throw "Unbalanced brackets";
			}
			stack[stack.length - 1].value.content = value;
			value = stack[stack.length - 1].value;
			bracketCount--;
		} else if (state.op.associativity === "ul") {
			console.log(token.value, "ul");
			value = {op: state.op.value, left: value};
		} else if (state.op.associativity === "ur") {
			console.log(token.value, "ur");
			state.value = {op: state.op.value};
			stack.push(state);
			value = undefined;
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			console.log(token.value, "bl or br");	
			state.value = {op: state.op.value, left: value};
			stack.push(state);
			value = undefined;
		} else {
			throw "Unknown state in loop";
		}

		// Determine the next operator based on the next token (if there is any)
		var lookahead = toks.lookahead();

		// Reached EOF?
		if (lookahead === undefined) {
			if (state.op.closingBracket) {	
				stack.pop();
//				if (mode === Mode_Bracket && stack.length === 0) {
//					return value;
//				}
			}
			break;
		}

		if (state.op.closingBracket) {
			var state = stack.pop();
//			console.log("BRACKs", bracketOnly, stack.length, stack);
			if (mode === Mode_Bracket && stack.length === 1) {
				value = finishRecursions(-1, stack, value);
				return value.right;
			}
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				if (mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) {
					break;
				}
				throw "Unknown operator: " + lookahead.value;
			}
			value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value);
			state = {op: op};			
		} else if (state.op.bracket) {
			var op = findOperatorDownwards(lookahead, 0);
			if (!op) {
				throw "Unknown operator: " + lookahead.value;
			}
			state = {op: op};
			value = undefined;
		} else if (state.op.associativity === "none") {
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				if (mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) {
					break;
				}
				throw "Unknown operator (2): " + lookahead.value;
			}
			value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value);
			state = {op: op};
		} else if (state.op.associativity === "ul") {
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				if (mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) {
					break;
				}
				throw "Unknown operator: " + lookahead.value;
			}
			value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value);
			state = {op: op};
		} else if (state.op.associativity === "ur") {
			value = undefined;
			var op = findOperatorDownwards(lookahead, state.op.level);
			if (!op) {
				if ((mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) && state.op.value === 'program' && lookahead.value === ";") {
					break;
				}
				throw "Unknown operator (1): " + lookahead.value;
			}
			state = {op: op};
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			var op = findOperatorDownwards(lookahead, state.op.level + 1);
			if (!op) {
				throw "Unknown operator: " + lookahead.value;
			}
			state = {op: op};
			value = undefined;
		} else {
			throw "Unknown state in loop";
		}

		if ((mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) && lookahead.value === ";" && bracketCount === 0) {
			break;
		}
		if ((mode === Mode_Expression || mode === Mode_ExpressionWithoutCall) && state.op.closingBracket && bracketCount === 0) {
			break;
		}
		if (mode === Mode_ExpressionWithoutCall && state.op.value === "(" && state.op.associativity === "ul" && bracketCount === 0) {
			break;
		}
	} while(token = toks.next());

	// Finish all recursions upwards
	value = finishRecursions(-1, stack, value);
	if (stack.length > 0) {
		throw "Unexpected end of file";
	}

	return value.right;
}

exports.foo = foo;
