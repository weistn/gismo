// var esprima = require('esprima');
var lexer = require("./lexer.js");
var escodegen = require('escodegen');
var fs = require('fs');

function foo() {
	var str = "var a = 12; runat compile { console.log('Hello Compiler'); } console.log('a')";
//	var str = "const a = 32; debugger";
//	var str = "for(var a in x);"
//	var str = "for(a=0;a<4;a++){print(a)}";
//	var str = "switch(a) { case 0: case 1+2: x; break; default: z}";
//	var str = "if (a) { 1+2 } else if (b) { 3+4 } else { 5 }";
//	var str = "let a =42";
//	var str = "{get x() { return 12 }, set x(y) {this.y = y;}}";
//	var str = "{get x() { return 12 }, set x(y) { this.y = x;}, foo:42}";
//	var str = "try { a+b } catch(e) { 1+2 } finally { 3+4}"
//	var str = "do { var a = 2 } while(true); while(false) { break; continue; break foo; continue bar}";
//	var str = "function x(){ console.log(\"Hallo Welt\");\nb = {x:42, a:[1,2,3]} }";

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

	var tokens = lexer.tokenize(str, {loc: true, raw: true});
	console.log(tokens);
	var toks = new tokenizer(tokens);
//	var parsed = parseTopLevelStatements(toks);
	var parsed = compile(toks);
	console.log(JSON.stringify(parsed, null, '\t'));

	var result = escodegen.generate(parsed, {sourceMapWithCode: true, sourceMap: "in.gismo", sourceContent: str});
	console.log(JSON.stringify(result));

	fs.writeFileSync('out.js', result.code + "\n//# sourceMappingURL=out.js.map");
	fs.writeFileSync('out.js.map', result.map.toString());
	fs.writeFileSync('in.gismo', str);
	return 42;
}
	
	// Parses an expression up to the point where the next symbol cannot be added to the expression any more.
var	Mode_Expression = 1,
	Mode_ExpressionWithoutComma = 2,
	// Parses an expression, but stops at call operation. Required when parsing "new ... ()"" since "..." must not contain
	// a function call at top-level.
	Mode_ExpressionWithoutCall = 3,
	Mode_ExpressionWithoutColon = 4

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
	var loc = tokenizer.lookback().loc;
	var name = tokenizer.presumeIdentifier(true);
	if (name) {
		name = {type: "Identifier", name: name.value, loc: name.loc};
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
		id: name,
		loc: loc
	};
}

function newParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
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
		arguments: arguments,
		loc: loc
	};
}

function functionDeclParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var tok = tokenizer.expectIdentifier();
	var name = {type: "Identifier", name: tok.value, loc: tok.loc};
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
		id: name,
		loc: loc
	};
}

function forParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	tokenizer.expect("(");
	// Test whether it is a for...in loop
	var v = tokenizer.presume("var", true);
	var name = tokenizer.presumeIdentifier(true);
	if (name !== undefined && tokenizer.presume("in", true)) {
		var left;
		left = {type: "Identifier", name: name.value, loc: name.loc};
		if (v !== undefined) {
			left = {type: "VariableDeclaration", loc: v.loc, kind: "var", declarations: [{type: "VariableDeclarator", loc: name.loc, init: null, id: left}]};
		}
		var right = parseExpression(tokenizer);
		tokenizer.expect(")");
		var code = parseStatementOrBlockStatement(tokenizer);
		return {
			type: "ForInStatement",
			left: left,
			right: right,
			body: code,
			each: false,
			loc: loc
		}
	} else {
		if (v !== undefined) {
			tokenizer.undo();
		}
		if (name !== undefined) {
			tokenizer.undo();
		}
	}

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
		body: code,
		loc: loc
	};
}

function whileParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	tokenizer.expect("(");
	var args = parseExpression(tokenizer, Mode_Expression);
	tokenizer.expect(")");
	var code = parseStatementOrBlockStatement(tokenizer);
	return {
		type: "WhileStatement",
		test: args,
		body: code,
		loc: loc
	};
}

function ifParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	tokenizer.expect("(");
	var args = parseExpression(tokenizer, Mode_Expression);
	tokenizer.expect(")");
	var code = parseStatementOrBlockStatement(tokenizer);
	var alternate = null;
	if (tokenizer.presume('else', true)) {
		alternate = parseStatementOrBlockStatement(tokenizer);
	}
	return {
		type: "IfStatement",
		test: args,
		consequent: code,
		alternate: alternate,
		loc: loc
	};
}

function switchParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	tokenizer.expect('(');
	var discriminant = parseExpression(tokenizer);
	tokenizer.expect(')');
	var cases = [];
	tokenizer.expect('{');
	while(tokenizer.lookahead() !== undefined && !tokenizer.presume('}', false)) {
		var token, test;
		if (token = tokenizer.presume("case", true)) {
			test = parseExpression(tokenizer, Mode_ExpressionWithoutColon);
			tokenizer.expect(":");
		} else if (token = tokenizer.presume("default", true)) {
			tokenizer.expect(":");
			test = null;
		} else {
			throw "SyntaxError: Unexpected token '" + tokenizer.lookahead() + "'";
		}
		var consequent = [];
		while( tokenizer.lookahead() !== undefined && !tokenizer.presume('case', false) && !tokenizer.presume('default', false) && !tokenizer.presume('}', false)) {
			consequent.push(parseStatement(tokenizer));
		}
		cases.push( {type: "SwitchCase", test: test, consequent: consequent, loc: token.loc} );
	}
	tokenizer.expect('}');
	return {
		type: "SwitchStatement",
		discriminant: discriminant,
		cases: cases,
		loc: loc
	};
}

function returnParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var argument = parseExpressionStatement(tokenizer);
	if (argument !== undefined) {
		argument = argument.expression;
	}
	return {
		type: "ReturnStatement",
		argument: argument,
		loc: loc
	};
}

function breakParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var name = tokenizer.presumeIdentifier(true);
	parseEndOfStatement(tokenizer);
	return {
		type: "BreakStatement",
		label: name === undefined ? null : {type: "Identifier", name: name.value, loc: name.loc},
		loc: loc
	};
}

function continueParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var name = tokenizer.presumeIdentifier(true);
	parseEndOfStatement(tokenizer);
	return {
		type: "ContinueStatement",
		label: name === undefined ? null : {type: "Identifier", name: name.value, loc: name.loc},
		loc: loc
	};
}

function throwParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var expression = parseExpressionStatement(tokenizer);
	if (expression === undefined) {
		throw "SyntaxError: Missing expression in 'throw' statement";
	}
	return {
		type: "ThrowStatement",
		expression: expression,
		loc: loc
	};
}

function varParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var declarations = [];
	do {
		var name = tokenizer.expectIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: {type: "Identifier", name: name.value, loc: name.loc}, loc: {start: name.loc.start}};
		if (tokenizer.presume('=', true)) {
			v.init = parseExpression(tokenizer, Mode_ExpressionWithoutComma);
			v.loc.end = tokenizer.lookback().loc.end;
		} else {
			v.loc.end = name.loc.end;
		}
		declarations.push(v);
	} while( tokenizer.presume(',', true) );
	parseEndOfStatement(tokenizer);
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "var",
		loc: loc
	};
}

function letParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var declarations = [];
	do {
		var name = tokenizer.expectIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: {type: "Identifier", name: name.value, loc: name.loc}, loc: {start: name.loc.start}};
		if (tokenizer.presume('=', true)) {
			v.init = parseExpression(tokenizer, Mode_ExpressionWithoutComma);
			v.loc.end = tokenizer.lookback().loc.end;
		} else {
			v.loc.end = name.loc.end;
		}
		declarations.push(v);
	} while( tokenizer.presume(',', true) );
	parseEndOfStatement(tokenizer);
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "let",
		loc: loc
	};
}

function constParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var declarations = [];
	do {
		var name = tokenizer.expectIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: {type: "Identifier", name: name.value, loc: name.loc}, loc: {start: name.loc.start}};
		tokenizer.expect('=');
		v.init = parseExpression(tokenizer, Mode_ExpressionWithoutComma);
		v.loc.end = tokenizer.lookback().loc.end;
		declarations.push(v);
	} while( tokenizer.presume(',', true) );
	parseEndOfStatement(tokenizer);
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "const",
		loc: loc
	};
}

function doParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var code = parseBlockStatement(tokenizer);
	tokenizer.expect('while');
	tokenizer.expect("(");
	var args = parseExpression(tokenizer, Mode_Expression);
	tokenizer.expect(")");
	parseEndOfStatement(tokenizer);
	return {
		type: "DoWhileStatement",
		test: args,
		body: code,
		loc: loc
	};
}

function tryCatchParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	var block = parseBlockStatement(tokenizer);
	var handlers = [];
	var guardedHandlers = [];
	var finalizer = null;
	var c;
	while (c = tokenizer.presume('catch', true)) {
		tokenizer.expect("(");
		var param = tokenizer.expectIdentifier();
		tokenizer.expect(")");
		var body = parseBlockStatement(tokenizer);
		var handler = {type: "CatchClause", body: body, param: {type: "Identifier", name: param.value, loc: param.loc}, loc: c.loc};
		handlers.push(handler);
	}
	if (tokenizer.presume('finally', true)) {
		finalizer = parseBlockStatement(tokenizer);
	}
	if (handlers.length === 0 && finalizer === null) {
		throw "SyntaxError: Expected 'catch' or 'finally";
	}
	return {
		type: "TryStatement",
		block: block,
		handlers: handlers,
		guardedHandlers: guardedHandlers,
		finalizer : finalizer,
		loc: loc
	};
}

function debuggerParser(tokenizer) {
	var loc = tokenizer.lookback().loc;
	parseEndOfStatement(tokenizer);
	return {
		type: "DebuggerStatement",
		loc: loc
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
var stringTerminal;
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
	'function' : functionDeclParser,
	'var' : varParser,
	'do' : doParser,
	'break' : breakParser,
	'continue' : continueParser,
	'try' : tryCatchParser,
	'let' : letParser,
	'const' : constParser,
	'if' : ifParser,
	'switch' : switchParser,
	'debugger' : debuggerParser
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
		if (ops[j].type === "String") {
			stringTerminal = ops[j];
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
	if (token.type === "String") {
		return stringTerminal;
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
	var loc1 = toks.expect("[").loc;
	while(toks.lookahead().value !== undefined && toks.lookahead().value !== ']') {
		elements.push(parseExpression(toks, Mode_ExpressionWithoutComma));
		if (!toks.presume(",", true)) {
			break;
		}
	}
	var loc2 = toks.expect("]").loc;	
	return {type: "ArrayExpression", elements: elements, loc: {start: loc1.start, end: loc2.end}};
}

function parseObjectExpression(toks) {
	var properties = [];
	var loc1 = toks.expect("{").loc;
	while(toks.lookahead().value !== undefined && toks.lookahead().value !== '}') {
		var lookahead = toks.lookahead();
		var loc1 = lookahead ? lookahead.loc : undefined;
		var prop = {type: "Property"};
		var token = toks.next();
		if (token === undefined) {
			throw "SyntaxError: Unexpected end of file";
		}
		var lookahead = toks.lookahead();
		if (token.type === "Identifier" && (token.value === "get" || token.value === "set") && lookahead !== undefined && (lookahead.type === "Identifier" || lookahead.type === "String")) {
			var name = toks.next();
			if (name.type === "Identifier") {
				prop.key = {type: "Identifier", name: name.value, loc: name.loc };
			} else {
				prop.key = {type: "Literal", value: name.value, loc: name.loc };
			}
			var parameters = [];
			toks.expect("(");
			var parameters = parseExpression(toks, Mode_Expression);
			if (parameters === undefined) {
				parameters = []
			} else if (parameters.type === "SequenceExpression") {
				parameters = parameters.expressions;
			} else {
				parameters = [parameters];
			}
			toks.expect(")");
			prop.value = {type: "FunctionExpression", loc: name.loc, body: parseBlockStatement(toks), params: parameters, id: null};
			prop.kind = token.value;
		} else {
			if (token.type === "Identifier") {
				prop.key = {type: "Identifier", name: token.value, loc: token.loc };
			} else if (token.type === "String") {
				prop.key = {type: "Literal", value: token.value, loc: token.loc };
			} else {
				throw "SyntaxError: Unexpected token '" + token.value + "'";
			}
			toks.expect(":");
			prop.value = parseExpression(toks, Mode_ExpressionWithoutComma);
			prop.kind = "init";
		}
		var lookback = toks.lookback();
		var loc2 = lookback ? lookback.loc : undefined;
		prop.loc = {start: loc1.start, end: loc2.end};
		properties.push(prop);
		if (!toks.presume(",", true)) {
			break;
		}
	}
	var loc2 = toks.expect("}").loc;
	return {type: "ObjectExpression", properties: properties, loc: {start: loc1.start, end: loc2.end}};
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
//			console.log(token.value, "parser");
			value = state.op.parser(toks);
		} else if (state.op.bracket && state.op.associativity === "none") {
//			console.log(token.value, "bracket");
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
//			console.log(token.value, "post-bracket");
			if (state.op.value === "(") {
				state.value = {callee: value, type: "CallExpression", loc: token.loc};
			} else if (state.op.value === "[") {
				state.value = {object: value, type: "MemberExpression", computed: true, loc: token.loc};
			} else {
				state.value = {operator: state.op.value, left: value, loc: token.loc};
			}
			stack.push(state);
			value = undefined;
			bracketCount++;
		} else if (state.op.closingBracket) {
//			console.log(token.value, "closing_bracket");
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
//			console.log(token.value, "terminal");
			if (token.value === "this") {
				value = {type: "ThisExpression", loc: token.loc};
			} else if (token.type === "Identifier") {
				value = {type: "Identifier", name: token.value, loc: token.loc};
			} else {
				value = {type: "Literal", loc: token.loc, value: token.value === "true" ? true : (token.value === "false" ? false : (token.value === "null" ? null : (token.type === "String" ? token.value : parseFloat(token.value))))};
			}
		} else if (state.op.associativity === "ul") {
//			console.log(token.value, "ul");
			value = {operator: state.op.value, argument: value, prefix: false, loc: token.loc, type: state.op.value === "++" || state.op.value === "--" ? "UpdateExpression" : "UnaryExpression"};
		} else if (state.op.associativity === "ur") {
//			console.log(token.value, "ur");
			state.value = {operator: state.op.value, prefix: true, type: "UnaryExpression", loc: token.loc};
			stack.push(state);
			value = undefined;
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
//			console.log(token.value, "bl or br");	
			if (state.op.value === ",") {
				state.value = {expressions: [value], type: "SequenceExpression", loc: token.loc};
			} else if (state.op.value === ".") {
				state.value = {object: value, computed: false, type: "MemberExpression", loc: token.loc};
			} else if (state.op.value === "=") {
				state.value = {left: value, operator: "=", type: "AssignmentExpression", loc: token.loc};
			} else {
				state.value = {operator: state.op.value, left: value, type: "BinaryExpression", loc: token.loc};
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
		} else if (state.op.bracket && state.op.value === "(") {
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
		if (mode === Mode_ExpressionWithoutColon && state.op.value === ":" && bracketCount === 0) {
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
	var loc1 = toks.expect("{").loc;
	var statements = parseStatements(toks);
	var loc2 = toks.expect("}").loc;
	return {type: "BlockStatement", body: statements, loc: {start: loc1.start, end: loc2.end}};
}

function parseExpressionStatement(toks) {
	var lookahead = toks.lookahead();
	if (lookahead === undefined) {
		return undefined;
	}
	var result;
	var body = parseExpression(toks, Mode_Expression);
	var locend = toks.lookback().loc.end;
	if (body === undefined) {
		result = {type: "EmptyStatement", loc: {start: lookahead.loc.start, end: locend}};
	} else {
		result = { type: "ExpressionStatement", expression: body, loc: {start: lookahead.loc.start, end: locend}};
	}
	parseEndOfStatement(toks);
	return result;	
}

function parseEndOfStatement(toks) {
	// Determine the end of the statement. It must either be ';', a new line, or a closing bracket
	var lookahead = toks.lookahead();
	if (lookahead === undefined || lookahead.value === '}' || lookahead.value === ')' || lookahead.value === ']') {
		// Do nothing by intention
	} else if (lookahead.value === ";") {
		toks.next();
	} else {
		var lookback = toks.lookback();
		if (!lookback || lookback.loc.end.line === lookahead.loc.start.line) {
			throw "SyntaxError: Expected semicolon";
		}
	}
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

// Namespace where all compile-time code is executed 
var compileNS = { };

function compile(toks) {
	var result = [];
	while( toks.lookahead() !== undefined && toks.lookahead().value !== '}') {
		if (toks.presume("runat", true)) {
			if (toks.presume("compile", true)) {
				var code = parseBlockStatement(toks);
				var func = {type: "FunctionExpression", params:[], id: null, body: code};
				var js = escodegen.generate(func);
				executeAtCompileTime(js);
			} else {
				throw "SyntaxError: Unknown run-level '" + toks.next() + "'";
			}
		} else {
			var body = parseStatement(toks);
			result.push(body);
		}
	}
	return { type: "Program", body: result};
}

function executeAtCompileTime(js) {
	console.log("Executing: ", js);
	var func = eval("(" + js + ")");
	func.apply(compileNS);
}

exports.foo = foo;
