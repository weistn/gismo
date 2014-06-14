// var esprima = require('esprima');
var lexer = require("./lexer.js");
var compiler = require("./compiler.js");
var escodegen = require('escodegen');
	
// Parses an expression up to the point where the next symbol cannot be added to the expression any more.
var	Mode_Expression = 1,
	Mode_ExpressionWithoutComma = 2,
	// Parses an expression, but stops at call operation. Required when parsing "new ... ()"" since "..." must not contain
	// a function call at top-level.
	Mode_ExpressionWithoutCall = 3,
	Mode_ExpressionWithoutColon = 4

function Parser() {
	this.precompSrc = "";
	this.exports = {
		syntax: []
	};

	// The statements supported by this parser
	this.statementKeywords = {
		'return' : returnParser.bind(this),
		'throw' : throwParser.bind(this),
		'for' : forParser.bind(this),
		'while' : whileParser.bind(this),
		'function' : functionDeclParser.bind(this),
		'var' : varParser.bind(this),
		'do' : doParser.bind(this),
		'break' : breakParser.bind(this),
		'continue' : continueParser.bind(this),
		'try' : tryCatchParser.bind(this),
		'let' : letParser.bind(this),
		'const' : constParser.bind(this),
		'if' : ifParser.bind(this),
		'switch' : switchParser.bind(this),
		'debugger' : debuggerParser.bind(this),
		'import' : importParser.bind(this)
	};

	// Precedence of built-in JS operators
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
		[
		],
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
		// Regular Expression
		{
			type: 'Punctuator',
			value: '/',
			associativity: "none",
			parser: regexParser.bind(this)
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
			parser: newParser.bind(this)
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
			parser: functionParser.bind(this)
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

	// The operators supported by this parser
	this.operators = { };
	// Initialize with standard JS operators
	for(var i = 0; i < operatorPrecedence.length; i++) {
		var ops = operatorPrecedence[i];
		for(var j = 0; j < ops.length; j++) {
			ops[j].level = i;
			if (ops[j].type === "Identifier") {
				this.identifierTerminal = ops[j];
				continue;
			}
			if (ops[j].type === "Numeric") {
				this.numericTerminal = ops[j];
				continue;
			}
			if (ops[j].type === "String") {
				this.stringTerminal = ops[j];
				continue;
			}
			if (this.operators[ops[j].value] !== undefined) {
				this.operators[ops[j].value].push(ops[j]);
			} else {
				this.operators[ops[j].value] = [ops[j]];
			}
		}
	}
}

function functionParser() {
	var loc = this.tokenizer.lookback().loc;
	var name = this.tokenizer.presumeIdentifier(true);
	if (name) {
		name = {type: "Identifier", name: name.value, loc: name.loc};
	}
	this.tokenizer.expect("(");
	var parameters = this.parseExpression(Mode_Expression);
	if (parameters === undefined) {
		parameters = []
	} else if (parameters.type === "SequenceExpression") {
		parameters = parameters.expressions;
	} else {
		parameters = [parameters];
	}
	this.tokenizer.expect(")");
	var code = this.parseBlockStatement();
	return {
		type: "FunctionExpression",
		params: parameters,
		body: code,
		id: name,
		loc: loc
	};
}

function newParser() {
	var loc = this.tokenizer.lookback().loc;
	var clas = this.parseExpression(Mode_ExpressionWithoutCall);
	var arguments = [];
	var t = this.tokenizer.presume("(", true);
	if (t !== undefined) {
		arguments = this.parseExpression(Mode_Expression);
		this.tokenizer.expect(')');
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

function regexParser() {
	var t = this.tokenizer.expectRegExp();
	t.type = "Literal";
	return t;
}

function functionDeclParser() {
	var loc = this.tokenizer.lookback().loc;
	var tok = this.tokenizer.expectIdentifier();
	var name = {type: "Identifier", name: tok.value, loc: tok.loc};
	this.tokenizer.expect("(");
	var parameters = this.parseExpression(Mode_Expression);
	if (parameters === undefined) {
		parameters = []
	} else if (parameters.type === "SequenceExpression") {
		parameters = parameters.expressions;
	} else {
		parameters = [parameters];
	}
	this.tokenizer.expect(")");
	var code = this.parseBlockStatement();
	return {
		type: "FunctionDeclaration",
		params: parameters,
		body: code,
		id: name,
		loc: loc
	};
}

function forParser() {
	var loc = this.tokenizer.lookback().loc;
	this.tokenizer.expect("(");
	var init;
	var vartoken;
	// Test whether it is a for...in loop
	if (vartoken = this.tokenizer.presume("var", true)) {
		var count = 0;
		var declarations = [];
		do {
			count++;
			var name = this.tokenizer.expectIdentifier();
			if (count === 1 && name !== undefined && this.tokenizer.presume("in", true)) {
				var left = {type: "VariableDeclaration", loc: vartoken.loc, kind: "var", declarations: [{type: "VariableDeclarator", loc: name.loc, init: null, id: {type: "Identifier", name: name.value, loc: name.loc}}]};
				var right = this.parseExpression();
				this.tokenizer.expect(")");
				var code = this.parseStatementOrBlockStatement();
				return {
					type: "ForInStatement",
					left: left,
					right: right,
					body: code,
					each: false,
					loc: loc
				};
			}
			var v = {type: "VariableDeclarator", init: null, id: {type: "Identifier", name: name.value, loc: name.loc}, loc: {start: name.loc.start}};
			if (this.tokenizer.presume('=', true)) {
				v.init = this.parseExpression(Mode_ExpressionWithoutComma);
				v.loc.end = this.tokenizer.lookback().loc.end;
			} else {
				v.loc.end = name.loc.end;
			}
			declarations.push(v);
		} while( this.tokenizer.presume(',', true) );
		init = {
			type: "VariableDeclaration",
			declarations: declarations,
			kind: "var",
			loc: loc
		};
	} else {
		init = this.parseExpression(Mode_Expression);
		if (init.type === "BinaryExpression" && init.operator === "in") {
			this.tokenizer.expect(")");
			var code = this.parseStatementOrBlockStatement();
			return {
				type: "ForInStatement",
				left: init.left,
				right: init.right,
				body: code,
				each: false,
				loc: loc
			};
		}
	}
	var test, update;
	this.tokenizer.expect(";");
	test = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(";");
	update = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(")");
	var code = this.parseStatementOrBlockStatement();
	return {
		type: "ForStatement",
		init: init,
		test: test,
		update: update,
		body: code,
		loc: loc
	};
}

function whileParser() {
	var loc = this.tokenizer.lookback().loc;
	this.tokenizer.expect("(");
	var args = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(")");
	var code = this.parseStatementOrBlockStatement();
	return {
		type: "WhileStatement",
		test: args,
		body: code,
		loc: loc
	};
}

function ifParser() {
	var loc = this.tokenizer.lookback().loc;
	this.tokenizer.expect("(");
	var args = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(")");
	var code = this.parseStatementOrBlockStatement();
	var alternate = null;
	if (this.tokenizer.presume('else', true)) {
		alternate = this.parseStatementOrBlockStatement();
	}
	return {
		type: "IfStatement",
		test: args,
		consequent: code,
		alternate: alternate,
		loc: loc
	};
}

function switchParser() {
	var loc = this.tokenizer.lookback().loc;
	this.tokenizer.expect('(');
	var discriminant = this.parseExpression();
	this.tokenizer.expect(')');
	var cases = [];
	this.tokenizer.expect('{');
	while(this.tokenizer.lookahead() !== undefined && !this.tokenizer.presume('}', false)) {
		var token, test;
		if (token = this.tokenizer.presume("case", true)) {
			test = this.parseExpression(Mode_ExpressionWithoutColon);
			this.tokenizer.expect(":");
		} else if (token = this.tokenizer.presume("default", true)) {
			this.tokenizer.expect(":");
			test = null;
		} else {
			throw "SyntaxError: Unexpected token '" + this.tokenizer.lookahead() + "'";
		}
		var consequent = [];
		while( this.tokenizer.lookahead() !== undefined && !this.tokenizer.presume('case', false) && !this.tokenizer.presume('default', false) && !this.tokenizer.presume('}', false)) {
			consequent.push(this.parseStatement());
		}
		cases.push( {type: "SwitchCase", test: test, consequent: consequent, loc: token.loc} );
	}
	this.tokenizer.expect('}');
	return {
		type: "SwitchStatement",
		discriminant: discriminant,
		cases: cases,
		loc: loc
	};
}

function returnParser() {
	var loc = this.tokenizer.lookback().loc;
	var argument = this.parseExpressionStatement();
	if (argument !== undefined) {
		argument = argument.expression;
	}
	return {
		type: "ReturnStatement",
		argument: argument,
		loc: loc
	};
}

function breakParser() {
	var loc = this.tokenizer.lookback().loc;
	var name = this.tokenizer.presumeIdentifier(true);
	this.parseEndOfStatement();
	return {
		type: "BreakStatement",
		label: name === undefined ? null : {type: "Identifier", name: name.value, loc: name.loc},
		loc: loc
	};
}

function continueParser() {
	var loc = this.tokenizer.lookback().loc;
	var name = this.tokenizer.presumeIdentifier(true);
	this.parseEndOfStatement();
	return {
		type: "ContinueStatement",
		label: name === undefined ? null : {type: "Identifier", name: name.value, loc: name.loc},
		loc: loc
	};
}

function throwParser() {
	var loc = this.tokenizer.lookback().loc;
	var expression = this.parseExpressionStatement();
	if (expression === undefined) {
		throw "SyntaxError: Missing expression in 'throw' statement";
	}
	return {
		type: "ThrowStatement",
		argument: expression.expression,
		loc: loc
	};
}

function varParser() {
	var loc = this.tokenizer.lookback().loc;
	var declarations = [];
	do {
		var name = this.tokenizer.expectIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: {type: "Identifier", name: name.value, loc: name.loc}, loc: {start: name.loc.start}};
		if (this.tokenizer.presume('=', true)) {
			v.init = this.parseExpression(Mode_ExpressionWithoutComma);
			v.loc.end = this.tokenizer.lookback().loc.end;
		} else {
			v.loc.end = name.loc.end;
		}
		declarations.push(v);
	} while( this.tokenizer.presume(',', true) );
	this.parseEndOfStatement();
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "var",
		loc: loc
	};
}

function letParser() {
	var loc = this.tokenizer.lookback().loc;
	var declarations = [];
	do {
		var name = this.tokenizer.expectIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: {type: "Identifier", name: name.value, loc: name.loc}, loc: {start: name.loc.start}};
		if (this.tokenizer.presume('=', true)) {
			v.init = this.parseExpression(Mode_ExpressionWithoutComma);
			v.loc.end = this.tokenizer.lookback().loc.end;
		} else {
			v.loc.end = name.loc.end;
		}
		declarations.push(v);
	} while( this.tokenizer.presume(',', true) );
	this.parseEndOfStatement();
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "let",
		loc: loc
	};
}

function constParser() {
	var loc = this.tokenizer.lookback().loc;
	var declarations = [];
	do {
		var name = this.tokenizer.expectIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: {type: "Identifier", name: name.value, loc: name.loc}, loc: {start: name.loc.start}};
		this.tokenizer.expect('=');
		v.init = this.parseExpression(Mode_ExpressionWithoutComma);
		v.loc.end = this.tokenizer.lookback().loc.end;
		declarations.push(v);
	} while( this.tokenizer.presume(',', true) );
	this.parseEndOfStatement();
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "const",
		loc: loc
	};
}

function doParser() {
	var loc = this.tokenizer.lookback().loc;
	var code = this.parseBlockStatement();
	this.tokenizer.expect('while');
	this.tokenizer.expect("(");
	var args = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(")");
	this.parseEndOfStatement();
	return {
		type: "DoWhileStatement",
		test: args,
		body: code,
		loc: loc
	};
}

function tryCatchParser() {
	var loc = this.tokenizer.lookback().loc;
	var block = this.parseBlockStatement();
	var handlers = [];
	var guardedHandlers = [];
	var finalizer = null;
	var c;
	while (c = this.tokenizer.presume('catch', true)) {
		this.tokenizer.expect("(");
		var param = this.tokenizer.expectIdentifier();
		this.tokenizer.expect(")");
		var body = this.parseBlockStatement();
		var handler = {type: "CatchClause", body: body, param: {type: "Identifier", name: param.value, loc: param.loc}, loc: c.loc};
		handlers.push(handler);
	}
	if (this.tokenizer.presume('finally', true)) {
		finalizer = this.parseBlockStatement();
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

function debuggerParser() {
	var loc = this.tokenizer.lookback().loc;
	return {
		type: "DebuggerStatement",
		loc: loc
	};
}

function importParser() {
	var loc = this.tokenizer.lookback().loc;
	var name = this.tokenizer.next();
	if (!name || name.type !== "String") {
		throw "SyntaxError: Expected string after 'import'";
	}
	var as;
	if (this.tokenizer.presume('as', true)) {
		as = this.tokenizer.expectIdentifier();
	} else {
		// Infer a module name from the path
		var filename = name.value;
		if (name.value.indexOf('/') !== -1 || name.value.indexOf('\\') !== -1) {
			filename = name.value.replace(/^.*[\\\/]/, '')
		}
		filename = filename.replace(/\.js$/, '');
		if (filename === "") {
			throw "SyntaxError: Invalid name for an import path";
		}
		as = {
			value: filename,
			loc: name.loc
		};
	}
	this.parseEndOfStatement();

	// Try to locate the JS file
	try {
		var jsfile = require.resolve(name.value);
	} catch(err) {
		throw "Error: Cannot find module '" + name.value + "'";
	}
	// Import the gismo module
	var path = jsfile.substr(0, jsfile.lastIndexOf('/') + 1);
	var c = new compiler.Compiler(path);
	var exp = c.importModule();
	// Register exported syntax extensions
	for(var i = 0; i < exp.syntax.length; i++) {
		var s = exp.syntax[i];
		switch (s.type) {
			case "operand":
				this.newOperand(s.name, s.parser);
				break;
			default:
				throw "Error: Unsupported syntax extension in imported module '" + path + "'";
		}
	}

	return {
		loc: loc,
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": as.value,
                    loc: as.loc
                },
                "init": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "MemberExpression",
                        "computed": false,
                        "object": {
                            "type": "Identifier",
                            "name": "__runtime"
                        },
                        "property": {
                            "type": "Identifier",
                            "name": "__import"
                        }
                    },
                    "arguments": [
                        {
                            "type": "Literal",
                            "value": name.value,
                            loc: name.loc
                        }
                    ]
                }
            }
        ],
        "kind": "var"
    };
}

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

Parser.prototype.findOperatorDownwards = function(token, level) {
	if (token.type === "Identifier") {
		return this.identifierTerminal;
	}
	if (token.type === "Numeric") {
		return this.numericTerminal;
	}
	if (token.type === "String") {
		return this.stringTerminal;
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
	var ops = this.operators[token.value];
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

Parser.prototype.findOperatorUpwards = function(token, level) {
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
	var ops = this.operators[token.value];
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

Parser.prototype.finishRecursions = function(level, stack, value, lookahead) {
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
			if (state.op.generator) {
				state.value = state.op.generator(value);
			} else {
				state.value.argument = value;
			}
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

Parser.prototype.parseArrayExpression = function() {
	var elements = [];
//	var loc1 = this.tokenizer.expect("[").loc;
	var loc1 = this.tokenizer.lookback().loc;
	while(this.tokenizer.lookahead().value !== undefined && this.tokenizer.lookahead().value !== ']') {
		elements.push(this.parseExpression(Mode_ExpressionWithoutComma));
		if (!this.tokenizer.presume(",", true)) {
			break;
		}
	}
	var loc2 = this.tokenizer.expect("]").loc;	
	return {type: "ArrayExpression", elements: elements, loc: {start: loc1.start, end: loc2.end}};
}

Parser.prototype.parseObjectExpression = function() {
	var properties = [];
//	var loc1 = this.tokenizer.expect("{").loc;
	var loc1 = this.tokenizer.lookback().loc;
	while(this.tokenizer.lookahead().value !== undefined && this.tokenizer.lookahead().value !== '}') {
		var lookahead = this.tokenizer.lookahead();
		var loc1 = lookahead ? lookahead.loc : undefined;
		var prop = {type: "Property"};
		var token = this.tokenizer.next();
		if (token === undefined) {
			throw "SyntaxError: Unexpected end of file";
		}
		var lookahead = this.tokenizer.lookahead();
		if (token.type === "Identifier" && (token.value === "get" || token.value === "set") && lookahead !== undefined && (lookahead.type === "Identifier" || lookahead.type === "String")) {
			var name = this.tokenizer.next();
			if (name.type === "Identifier") {
				prop.key = {type: "Identifier", name: name.value, loc: name.loc };
			} else {
				prop.key = {type: "Literal", value: name.value, loc: name.loc };
			}
			var parameters = [];
			this.tokenizer.expect("(");
			var parameters = this.parseExpression(Mode_Expression);
			if (parameters === undefined) {
				parameters = []
			} else if (parameters.type === "SequenceExpression") {
				parameters = parameters.expressions;
			} else {
				parameters = [parameters];
			}
			this.tokenizer.expect(")");
			prop.value = {type: "FunctionExpression", loc: name.loc, body: this.parseBlockStatement(), params: parameters, id: null};
			prop.kind = token.value;
		} else {
			if (token.type === "Identifier") {
				prop.key = {type: "Identifier", name: token.value, loc: token.loc };
			} else if (token.type === "String") {
				prop.key = {type: "Literal", value: token.value, loc: token.loc };
			} else {
				throw "SyntaxError: Unexpected token '" + token.value + "'";
			}
			this.tokenizer.expect(":");
			prop.value = this.parseExpression(Mode_ExpressionWithoutComma);
			prop.kind = "init";
		}
		var lookback = this.tokenizer.lookback();
		var loc2 = lookback ? lookback.loc : undefined;
		prop.loc = {start: loc1.start, end: loc2.end};
		properties.push(prop);
		if (!this.tokenizer.presume(",", true)) {
			break;
		}
	}
	var loc2 = this.tokenizer.expect("}").loc;
	return {type: "ObjectExpression", properties: properties, loc: {start: loc1.start, end: loc2.end}};
}

Parser.prototype.parseExpression = function(mode) {
	var stack = [];
	var value, lookahead;
	var state = {op: expressionOperator};
	var token = {value: "expression", loc: {start: {line: 0}, end: {line: 0}}};
	var bracketCount = 0;

	do {
		// Process the current token (token[index]) with the current operator (state.op)
		if (state.op.parser) {
//			console.log(token.value, "parser");
			value = state.op.parser();
		} else if (state.op.bracket && state.op.associativity === "none") {
//			console.log(token.value, "bracket");
			if (state.op.value === '{') {
				value = this.parseObjectExpression();
			} else if (state.op.value === '[') {
				value = this.parseArrayExpression();

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
			value = this.finishRecursions(-1 ,stack, value, state.op.value);
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
//			} else if (token.type === "RegularExpression") {
//				value = {type: "Literal", value: token.value, loc: token.loc};
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
		lookahead = this.tokenizer.lookahead();

		// Reached EOF?
		if (lookahead === undefined) {
			if (state.op.closingBracket) {	
				stack.pop();
			}
			break;
		}

		if (state.op.closingBracket) {
			state = stack.pop();
			var op = this.findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				break
			}
			value = this.finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
			state = {op: op};
		} else if (state.op.bracket && (state.op.value === "(" || (state.op.associativity === "ul" && state.op.value === "["))) {
			var op = this.findOperatorDownwards(lookahead, 0);
			if (!op) {
				break;
			}
			state = {op: op};
			value = undefined;
		} else if (state.op.associativity === "none") {
			var op = this.findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				break
			}
			value = this.finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
			state = {op: op};
		} else if (state.op.associativity === "ul") {
			var op = this.findOperatorUpwards(lookahead, state.op.level);
			if (!op) {
				break;
			}
			value = this.finishRecursions(op.associativity === "br" ? op.level + 1 : op.level, stack, value, lookahead);
			state = {op: op};
		} else if (state.op.associativity === "ur") {
			value = undefined;
			var op = this.findOperatorDownwards(lookahead, state.op.level);
			if (!op) {
				break;
			}
			state = {op: op};
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			var op = this.findOperatorDownwards(lookahead, state.op.level + 1);
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

	} while(token = this.tokenizer.next());
	// Finish all recursions upwards
	value = this.finishRecursions(-1, stack, value, lookahead);
	if (stack.length > 0) {
		if (this.tokenizer.lookahead() === undefined) {
			throw "Unexpected end of file";
		}
		throw "Unexpected symbol '" + this.tokenizer.lookahead().value + "'";
	}
//	if (mode === Mode_Default && this.tokenizer.lookahead() !== undefined) {
//		throw "Unexpected symbol '" + this.tokenizer.lookahead().value + "'";
//	}
	return value.argument;
}

Parser.prototype.parseStatementOrBlockStatement = function() {
	if (this.tokenizer.lookahead().value === "{") {
		return this.parseBlockStatement();
	}
	return this.parseStatement();
}

Parser.prototype.parseBlockStatement = function() {
	var loc1 = this.tokenizer.expect("{").loc;
	var statements = this.parseStatements();
	var loc2 = this.tokenizer.expect("}").loc;
	return {type: "BlockStatement", body: statements, loc: {start: loc1.start, end: loc2.end}};
}

Parser.prototype.parseExpressionStatement = function() {
	var lookahead = this.tokenizer.lookahead();
	if (lookahead === undefined) {
		return undefined;
	}
	var result;
	var body = this.parseExpression(Mode_Expression);
	var locend = this.tokenizer.lookback().loc.end;
	if (body === undefined) {
		result = {type: "EmptyStatement", loc: {start: lookahead.loc.start, end: locend}};
	} else {
		result = { type: "ExpressionStatement", expression: body, loc: {start: lookahead.loc.start, end: locend}};
	}
	this.parseEndOfStatement();
	return result;	
}

Parser.prototype.parseEndOfStatement = function() {
	// Determine the end of the statement. It must either be ';', a new line, or a closing bracket
	var lookahead = this.tokenizer.lookahead();
	if (lookahead === undefined || lookahead.value === '}' || lookahead.value === ')' || lookahead.value === ']') {
		// Do nothing by intention
	} else if (lookahead.value === ";") {
		this.tokenizer.next();
	} else {
		var lookback = this.tokenizer.lookback();
		if (!lookback || lookback.loc.end.line === lookahead.loc.start.line) {
			throw "SyntaxError: Expected semicolon";
		}
	}
}

Parser.prototype.parseStatement = function() {
	var s = this.tokenizer.lookahead().value;
	var p = this.statementKeywords[s];
	if (p) {
		this.tokenizer.next();
		var result = p();
		if (typeof result === "string") {
			var l = lexer.newTokenizer(result);
			var tmp = this.tokenizer;
			this.tokenizer = l;
			result = this.parseStatements();
			this.tokenizer = tmp;
			if (result.length === 0) {
				return null;
			} else if (result.length === 1) {
				return result[0];
			} else {
//				console.log(JSON.stringify(result, null, "\t"));
				return {type: "BlockStatement", body: result, loc: {start: result[0].loc.start, end: result[result.length - 1].loc.end}};
			}
		} else if (typeof result === "object") {
			// TODO: Check that the object tree is ok
		} else {
			throw "ExtensionError: Parser for statement '" + s + "' must return a string or an AST object";
		}
		return result;
	}
	return this.parseExpressionStatement();
}

Parser.prototype.parseTopLevelStatements = function() {
	return { type: "Program", body: this.parseStatements()};
}

Parser.prototype.parseStatements = function() {
	var result = [];
	while( this.tokenizer.lookahead() !== undefined && this.tokenizer.lookahead().value !== '}') {
		var body = this.parseStatement();
		result.push(body);
	}
	return result;
}

Parser.prototype.parse = function(tokenizer) {
	this.tokenizer = tokenizer;
	var result = [];
	while( this.tokenizer.lookahead() !== undefined && this.tokenizer.lookahead().value !== '}') {
		if (this.tokenizer.presume("runat", true)) {
			if (this.tokenizer.presume("compile", true)) {
				var code = this.parseBlockStatement();
				var func = {type: "FunctionExpression", params:[], id: null, body: code};
//				console.log("CODE=", JSON.stringify(code, null, " "));
				var js = escodegen.generate(func);
				this.precompSrc += "(" + js + "());\n";
				this.executeAtCompileTime(js);
			} else {
				throw "SyntaxError: Unknown run-level '" + this.tokenizer.next() + "'";
			}
		} else {
			var body = this.parseStatement();
			result.push(body);
		}
	}

	return result;
}

Parser.prototype.executeAtCompileTime = function(js) {
//	console.log("Executing: ", js);
	// Populate the scope in which the code will be executed
	var parser = this;
	var exports = this.exports;
	var func = eval("(" + js + ")");
	func.apply({});
}

Parser.prototype.newStatement = function(keyword, parseFunc) {
	if (this.statementKeywords[keyword]) {
		throw "ExtensionError: Statement has already been registered: '" + keyword + "'";
	}
	this.statementKeywords[keyword] = parseFunc;
}

Parser.prototype.newOperand = function(keyword, parseFunc) {
	// TODO: Check conflicts with existing operands or operators
	this.tokenizer.registerKeyword(keyword);
	this.operators[keyword] = [
		{
			associativity: "none",
			value: keyword,
			type: "Keyword",
			parser: parseFunc,
			level: this.numericTerminal.level
		}
	];
};

Parser.prototype.newOperator = function(punctuator, options, generator) {
	// TODO: Check conflicts with existing operands or operators
	var associativity = "none";
	switch (options.associativity) {
		case "none":
			break;
		case "right":
			associativity = "ur";
			break;
		case "left":
			associativity = "ul";
			break;
		case "binary":
		case "binary-left":
			associativity = "bl";
			break;
		case "binary-right":
			associativity = "br";
			break;
		default:
			throw "ExtensionError: Unknown associativity '" + options.associativity + "'";
	}
	this.tokenizer.registerPunctuator(punctuator);
	this.operators[punctuator] = [
		{
			associativity: associativity,
			value: punctuator,
			type: "Punctuator",
			generator: generator,
			level: options.level
		}
	];	
};

exports.Parser = Parser;
