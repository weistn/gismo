var esprima = require('esprima');

function foo() {
	var tokens = esprima.tokenize("[1,2,(3+4)*5]; (1,2,3)", {loc: true});

//	var tokens = esprima.tokenize("{foo: 12, \"bar\": 13}", {loc: true});
//	var tokens = esprima.tokenize("return 1+2; return; return a,b,c;", {loc: true});
//	var tokens = esprima.tokenize("while(true) {1+2; return !x;;}; throw a", {loc: true});
//	var tokens = esprima.tokenize("5 * 6\n2+3\n var a = x,\nb = y\nreturn a\nvar b", {loc: true});
//	var tokens = esprima.tokenize("while(a<5){print(a)}", {loc: true});
//	var tokens = esprima.tokenize("for(var a=0;a<4;a++){print(a)}", {loc: true });
//	var tokens = esprima.tokenize("for(a=0;a<4;a++){print();print(a); print(a,b)}", {loc: true });
//	var tokens = esprima.tokenize("a.b.c()", {loc: true });
//	var tokens = esprima.tokenize("a[1,2].x", {loc: true });
//	var tokens = esprima.tokenize("new a; new a.x; new foo(); new foo(1); new foo(1,2); new x.y(); new (u.v); new (a.b)(); new a.b()(12)", {loc: true });
//	var tokens = esprima.tokenize("return a(12)[13].foo(); var a, b = 12, c", { });
//	var tokens = esprima.tokenize("a = function hudel(a,b) { x + y } - 3", {loc: true });
//	var tokens = esprima.tokenize("function hudel(a) { x + y } - 3", {loc: true });
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
	
	// Parses an expression up to the point where the next symbol cannot be added to the expression any more.
var	Mode_Expression = 1,
	Mode_ExpressionWithoutComma = 2,
	// Parses an expression, but stops at call operation. Required when parsing "new ... ()"" since "..." must not contain
	// a function call at top-level.
	Mode_ExpressionWithoutCall = 3

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

tokenizer.prototype.undo = function() {
	this.index--;
};

tokenizer.prototype.lookahead = function() {
	if (this.index === this.tokens.length) {
		return undefined;
	}
	return this.tokens[this.index];
};

tokenizer.prototype.lookback = function() {
	if (this.index === 0) {
		return undefined;
	}
	return this.tokens[this.index - 1];
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

tokenizer.prototype.expectIdentifier = function(errorMsg) {
	var t = this.next();
	if (t && t.type === "Identifier") {
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
	if (name) {
		name = {type: "Identifier", name: name.value};
	}
	tokenizer.expect("(");
	var parameters = parseExpression(tokenizer, Mode_Expression);
	if (parameters === undefined) {
		parameters = []
	} else if (parameters.type === "SequenceExpression") {
		parameters = parameters.expressions;
	} else {
		parameters = [parameters];
	}
	tokenizer.expect(")");
	var code = parseBlockStatement(tokenizer);
	return {
		type: "FunctionExpression",
		params: parameters,
		body: code,
		id: name
	};
}

function newParser(tokenizer) {
	var clas = parseExpression(tokenizer, Mode_ExpressionWithoutCall);
	var arguments = [];
	var t = tokenizer.presume("(", true);
	if (t !== undefined) {
		arguments = parseExpression(tokenizer, Mode_Expression);
		tokenizer.expect(')');
		if (arguments === undefined) {
			arguments = []
		} else if (arguments.type === "SequenceExpression") {
			arguments = arguments.expressions;
		} else {
			arguments = [arguments];
		}
	}
	return {
		type: "NewExpression",
		callee: clas,
		arguments: arguments
	};
}

function functionDeclParser(tokenizer) {
	var name = {type: "Identifier", name: tokenizer.expectIdentifier().value};
	tokenizer.expect("(");
	var parameters = parseExpression(tokenizer, Mode_Expression);
	if (parameters === undefined) {
		parameters = []
	} else if (parameters.type === "SequenceExpression") {
		parameters = parameters.expressions;
	} else {
		parameters = [parameters];
	}
	tokenizer.expect(")");
	var code = parseBlockStatement(tokenizer);
	return {
		type: "FunctionDeclaration",
		params: parameters,
		body: code,
		id: name
	};
}

function forParser(tokenizer) {
	tokenizer.expect("(");
	var init, test, update;
	if (tokenizer.presume("var", false)) {
		init = parseStatement(tokenizer);
	} else {
		init = parseExpression(tokenizer, Mode_Expression);
		tokenizer.expect(";");
	}
	test = parseExpression(tokenizer, Mode_Expression);
	tokenizer.expect(";");
	update = parseExpression(tokenizer, Mode_Expression);
	tokenizer.expect(")");
	var code = parseStatementOrBlockStatement(tokenizer);
	return {
		type: "ForStatement",
		init: init,
		test: test,
		update: update,
		body: code
	};
}

function whileParser(tokenizer) {
	tokenizer.expect("(");
	var args = parseExpression(tokenizer, Mode_Expression);
	tokenizer.expect(")");
	var code = parseStatementOrBlockStatement(tokenizer);
	return {
		type: "WhileStatement",
		test: args.content,
		body: code
	};
}

function returnParser(tokenizer) {
	var argument = parseExpressionStatement(tokenizer);
	if (argument.type === "ExpressionStatement") {
		argument = argument.expression;
	} else {
		argument = undefined;
	}
	return {
		type: "ReturnStatement",
		argument: argument
	};
}

function throwParser(tokenizer) {
	var expression = parseExpressionStatement(tokenizer);
	if (expression.type !== "ExpressionStatement") {
		throw "SyntaxError: Missing expression in 'throw' statement";
	}
	return {
		type: "ThrowStatement",
		expression: expression
	};
}

var operatorPrecedence = [
	[{
		type: 'Punctuator',
		value: ",",
		associativity: "br"
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
		bracket: true,
		value: "[",
		correspondingBracket: "]"
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
		type: 'String',
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
var expressionOperator = {
	type: "Expression",
	associativity: "ur",
	value: "expression",
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

var statementKeywords = {
	'return' : returnParser,
	'throw' : throwParser,
	'for' : forParser,
	'while' : whileParser,
	'function' : functionDeclParser
}

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
	if (ops === undefined) {
		return undefined;
	}
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
		if (value === undefined && state.op !== expressionOperator) {
			if (lookahead !== undefined) {
				throw "SyntaxError: Unexpected token '" + lookahead.value + "'";				
			}
			throw "Unexpected end of expression";
		}
		if (state.op.associativity === "ur") {
			state.value.argument = value;
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			if (state.op.value === ',') {
				if (value.type === "SequenceExpression") {
					state.value.expressions = state.value.expressions.concat(value.expressions);
				} else {
					state.value.expressions.push(value);
				}
			} else if (state.op.value === '.') {
				state.value.property = value;
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

function parseArrayExpression(toks) {
	var elements = [];
	toks.expect("[");
	while(toks.lookahead() !== undefined && toks.lookahead() !== ']') {
		elements.push(parseExpression(toks, Mode_ExpressionWithoutComma));
		if (!toks.presume(",", true)) {
			break;
		}
	}
	toks.expect("]");	
	return {type: "ArrayExpression", elements: elements};
}

function parseObjectExpression(toks) {
	var properties = [];
	toks.expect("{");
	while(toks.lookahead() !== undefined && toks.lookahead() !== '}') {
		var prop = {type: "Property"};
		var token = toks.next();
		if (token.type === "Identifier") {
			prop.key = {type: "Identifier", name: token.value };
		} else if (token.type === "String") {
			prop.key = {type: "Literal", value: token.value, raw: token.value };
		} else {
			throw "SyntaxError: Unexpected token '" + token.value + "'";
		}
		toks.expect(":");
		prop.value = parseExpression(toks, Mode_ExpressionWithoutComma);
		properties.push(prop);
		if (!toks.presume(",", true)) {
			break;
		}
	}
	toks.expect("}");
	return {type: "ObjectExpression", properties: properties, kind: "init"};
}

function parseExpression(toks, mode) {
	var stack = [];
	var value, lookahead;
	var state = {op: expressionOperator};
	var token = {value: "expression", loc: {start: {line: 0}, end: {line: 0}}};
	var bracketCount = 0;

	do {
		// Process the current token (token[index]) with the current operator (state.op)
		if (state.op.parser) {
			console.log(token.value, "parser");
			value = state.op.parser(toks);
		} else if (state.op.bracket && state.op.associativity === "none") {
			console.log(token.value, "bracket");
			if (state.op.value === '{') {
				toks.undo();
				value = parseObjectExpression(toks);
			} else if (state.op.value === '[') {
				toks.undo();
				value = parseArrayExpression(toks);
			} else {
				state.value = {operator: state.op.value};
				stack.push(state);
				value = undefined;
				bracketCount++;
			}
		} else if (state.op.bracket && state.op.associativity === "ul") {
			console.log(token.value, "post-bracket");
			if (state.op.value === "(") {
				state.value = {callee: value, type: "CallExpression"};
			} else if (state.op.value === "[") {
				state.value = {object: value, type: "MemberExpression", computed: true};
			} else {
				state.value = {operator: state.op.value, left: value};
			}
			stack.push(state);
			value = undefined;
			bracketCount++;
		} else if (state.op.closingBracket) {
			console.log(token.value, "closing_bracket");
			value = finishRecursions(-1 ,stack, value, state.op.value);
			if (stack.length === 0 || stack[stack.length - 1].op.correspondingBracket !== state.op.value) {
				throw "Unexpected closing bracket '" + state.op.value + "'";
			}
			if (stack[stack.length - 1].op.value === '(' && stack[stack.length - 1].op.associativity === "ul") {
				if (value && value.type === "SequenceExpression") {
					stack[stack.length - 1].value.arguments = value.expressions;
				} else if (value) {
					stack[stack.length - 1].value.arguments = [value];
				} else {
					stack[stack.length - 1].value.arguments = [];
				}
				value = stack[stack.length - 1].value;
			} else if (stack[stack.length - 1].op.value === '[' && stack[stack.length - 1].op.associativity === "ul") {
				if (value === undefined) {
					throw "SyntaxErrror: Unexpected token ']'";
				}
				stack[stack.length - 1].value.property = value;
				value = stack[stack.length - 1].value;
			} else if (stack[stack.length - 1].op.value === '(' && stack[stack.length - 1].op.associativity === "none") {
				// Do not change value by intention
			} else {
				stack[stack.length - 1].value.content = value;
				value = stack[stack.length - 1].value;
			}
			bracketCount--;
		} else if (state.op.associativity === "none") {
			console.log(token.value, "terminal");
			if (token.type === "Identifier") {
				value = {type: "Identifier", name: token.value};
			} else {
				value = {type: "Literal", raw: token.value, value: token.value === "true" ? true : (token.value === "false" ? false : (token.value === "null" ? null : (token.type === "String" ? token.value : parseFloat(token.value))))};
			}
		} else if (state.op.associativity === "ul") {
			console.log(token.value, "ul");
			value = {operator: state.op.value, argument: value, prefix: false, type: state.op.value === "++" || state.op.value === "--" ? "UpdateExpression" : "UnaryExpression"};
		} else if (state.op.associativity === "ur") {
			console.log(token.value, "ur");
			state.value = {operator: state.op.value, prefix: true, type: "UnaryExpression"};
			stack.push(state);
			value = undefined;
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			console.log(token.value, "bl or br");	
			if (state.op.value === ",") {
				state.value = {expressions: [value], type: "SequenceExpression"};
			} else if (state.op.value === ".") {
				state.value = {object: value, computed: false, type: "MemberExpression"};
			} else {
				state.value = {operator: state.op.value, left: value, type: "BinaryExpression"};
			}
			stack.push(state);
			value = undefined;
		} else {
			throw "Internal Error: Unknown state in loop";
		}

		// Determine the next operator based on the next token (if there is any)
		lookahead = toks.lookahead();

		// Reached EOF?
		if (lookahead === undefined) {
			if (state.op.closingBracket) {	
				stack.pop();
			}
			break;
		}

		if (state.op.closingBracket) {
			state = stack.pop();
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				break
			}
			value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
			state = {op: op};
		} else if (state.op.bracket && state.op.value !== "{") {
			var op = findOperatorDownwards(lookahead, 0);
			if (!op) {
				break;
			}
			state = {op: op};
			value = undefined;
		} else if (state.op.associativity === "none") {
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				break
			}
			value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
			state = {op: op};
		} else if (state.op.associativity === "ul") {
			var op = findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				break;
			}
			value = finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
			state = {op: op};
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

		// Expressions stop at a colon
		if (lookahead.value === ";" && bracketCount === 0) {
			break;
		}
		// Expressions stop at closing brackets that have not been opened by the expression itself
		if (state.op.closingBracket && bracketCount === 0) {
			break;
		}
		if (mode === Mode_ExpressionWithoutComma && state.op.value === "," && bracketCount === 0) {
			break;
		}
		// The 'new' operator needs an expression that stops at an opening round bracket
		if (mode === Mode_ExpressionWithoutCall && state.op.value === "(" && state.op.associativity === "ul" && bracketCount === 0) {
			break;
		}

	} while(token = toks.next());

	// Finish all recursions upwards
	value = finishRecursions(-1, stack, value, lookahead);
	if (stack.length > 0) {
		if (toks.lookahead() === undefined) {
			throw "Unexpected end of file";
		}
		throw "Unexpected symbol '" + toks.lookahead().value + "'";
	}
//	if (mode === Mode_Default && toks.lookahead() !== undefined) {
//		throw "Unexpected symbol '" + toks.lookahead().value + "'";
//	}
	return value.argument;
}

function parseStatementOrBlockStatement(toks) {
	if (toks.lookahead().value === "{") {
		return parseBlockStatement(toks);
	}
	return parseStatement(toks);
}

function parseBlockStatement(toks) {
	toks.expect("{");
	var statements = parseStatements(toks);
	toks.expect("}");
	return {type: "BlockStatement", body: statements};
}

function parseExpressionStatement(toks) {
	var result;
	var body = parseExpression(toks, Mode_Expression);
	if (body === undefined) {
		result = {type: "EmptyStatement"};
	} else {
		result = { type: "ExpressionStatement", expression: body};
	}
	// Determine the end of the statement. It must either be ';', a new line, or a closing bracket
	lookahead = toks.lookahead();
	if (lookahead === undefined || lookahead.value === '}' || lookahead.value === ')' || lookahead.value === ']') {
		// Do nothing by intention
	} else if (lookahead.value === ";") {
		toks.next();
	} else {
		var lookback = toks.lookback();
		if (!lookback || lookback.loc.end.line === lookahead.loc.start.line) {
			throw "SyntaxError: Expected colon";
		}
	}
	return result;	
}

function parseStatement(toks) {
	var p = statementKeywords[toks.lookahead().value];
	if (p) {
		toks.next();
		return p(toks);
	}
	return parseExpressionStatement(toks);
}

function parseTopLevelStatements(toks) {
	return { type: "Program", body: parseStatements(toks)};
}

function parseStatements(toks) {
	var result = [];
	while( toks.lookahead() !== undefined && toks.lookahead().value !== '}') {
		var body = parseStatement(toks);
//		if (body.type.length < 9 || body.type.substr(body.type.length - 9, 9) !== "Statement") {
//			body = { type: "ExpressionStatement", expression: body};
//		}
		result.push(body);
	}
	return result;
}

exports.foo = foo;
