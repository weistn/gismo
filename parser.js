// var esprima = require('esprima');
var lexer = require("./lexer.js");
var escodegen = require('escodegen');
var errors = require("./errors");
var path = require("path");

// Parses an expression up to the point where the next symbol cannot be added to the expression any more.
var	Mode_Expression = 1,
	Mode_ExpressionWithoutComma = 2,
	// Parses an expression, but stops at call operation. Required when parsing "new ... ()"" since "..." must not contain
	// a function call at top-level.
	Mode_ExpressionWithoutCall = 3,
	Mode_ExpressionWithoutColon = 4,
	Mode_Term = 5

function Parser(compiler) {
	this.Mode_Expression = Mode_Expression;
	this.Mode_ExpressionWithoutComma = Mode_ExpressionWithoutComma;
	this.Mode_ExpressionWithoutCall = Mode_ExpressionWithoutCall;
	this.Mode_ExpressionWithoutColon = Mode_ExpressionWithoutColon;
	this.Mode_Term = Mode_Term;

	this.tokenizer = null;
	this.compiler = compiler;
	this.keywords = [];
	this.punctuators = [];
	this.contextStack = [];

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
		'import' : importParser.bind(this),
		'export' : exportParser.bind(this)
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
			associativity: "ul",
			generator: conditionalParser.bind(this)
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
			generator: regexParser.bind(this)
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
			generator: newParser.bind(this)
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
			generator: functionParser.bind(this)
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

/// Returns the compiler that created this parser.
Parser.prototype.getCompiler = function() {
	return this.compiler;
};

/// Returns the current tokenizer used by this parser.
/// Can be null initially.
Parser.prototype.getTokenizer = function() {
	return this.tokenizer;
};

function functionParser() {
	var loc = this.tokenizer.location();
	var generator = false;
	if (this.tokenizer.presume("*", true)) {
		generator = true;
	}
	var name = this.tokenizer.presumeIdentifier(true);
	if (name) {
		name = {type: "Identifier", name: name.value, loc: name.loc};
	} else {
		name = null;
	}
	this.tokenizer.expect("(");
	var parameters;
	if (this.tokenizer.presume(")", true)) {
		parameters = [];
	} else {
		parameters = this.parseExpression(Mode_Expression);
		if (parameters.type === "SequenceExpression") {
			parameters = parameters.expressions;
		} else {
			parameters = [parameters];
		}
		for(var i = 0; i < parameters.length; i++) {
			if (parameters[i].type !== "Identifier") {
				this.throwError(parameters[i], "Expected a list of identifiers");
			}
		}
		this.tokenizer.expect(")");
	}
	var code = this.parseBlockStatement();
	var endloc = this.tokenizer.location();
	return {
		type: "FunctionExpression",
		params: parameters,
		body: code,
		id: name,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc},
		generator: generator
	};
}

function newParser() {
	var loc = this.tokenizer.location();
	var clas = this.parseExpression(Mode_ExpressionWithoutCall);
	var arguments = [];
	var t = this.tokenizer.presume("(", true);
	if (t !== null) {
		arguments = this.parseExpression(Mode_Expression);
		this.tokenizer.expect(')');
		if (arguments === null) {
			arguments = []
		} else if (arguments.type === "SequenceExpression") {
			arguments = arguments.expressions;
		} else {
			arguments = [arguments];
		}
	}
	var endloc = this.tokenizer.location();
	return {
		type: "NewExpression",
		callee: clas,
		arguments: arguments,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function regexParser() {
	var t = this.tokenizer.expectRegExp();
	t.type = "Literal";
	return t;
}

function conditionalParser(test) {
	var loc = this.tokenizer.location();
	var consequent = this.parseExpression(Mode_ExpressionWithoutColon);
	this.tokenizer.expect(':');
	var alternate = this.parseExpression(Mode_ExpressionWithoutComma);
	var endloc = this.tokenizer.location();
	return {
		type: "ConditionalExpression",
		test: test,
		consequent: consequent,
		alternate: alternate,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function functionDeclParser() {
	var loc = this.tokenizer.location();
	var generator = false;
	if (this.tokenizer.presume("*", true)) {
		generator = true;
	}
	var name = this.parseIdentifier();
	this.tokenizer.expect("(");
	var parameters;
	if (this.tokenizer.presume(")", true)) {
		parameters = [];
	} else {
		parameters = this.parseExpression(Mode_Expression);
		if (parameters.type === "SequenceExpression") {
			parameters = parameters.expressions;
		} else {
			parameters = [parameters];
		}
		for(var i = 0; i < parameters.length; i++) {
			if (parameters[i].type !== "Identifier") {
				this.throwError(parameters[i], "Expected a list of identifiers");
			}
		}
		this.tokenizer.expect(")");
	}
	var code = this.parseBlockStatement();
	var endloc = this.tokenizer.location();
	return {
		type: "FunctionDeclaration",
		params: parameters,
		body: code,
		id: name,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc},
		generator: generator
	};
}

function forParser() {
	var loc = this.tokenizer.location();
	this.tokenizer.expect("(");
	var init;
	var vartoken;
	// Test whether it is a for...in loop
	if (vartoken = this.tokenizer.presume("var", true)) {
		var count = 0;
		var declarations = [];
		do {
			count++;
			var name = this.parseIdentifier();
			if (count === 1 && this.tokenizer.presume("in", true)) {
				var left = {type: "VariableDeclaration", loc: vartoken.loc, kind: "var", declarations: [{type: "VariableDeclarator", loc: name.loc, init: null, id: name}]};
				var right = this.parseExpression();
				this.tokenizer.expect(")");
				var code = this.parseStatementOrBlockStatement();
				var endloc = this.tokenizer.location();
				return {
					type: "ForInStatement",
					left: left,
					right: right,
					body: code,
					each: false,
					loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
				};
			}
			var v = {type: "VariableDeclarator", init: null, id: name, loc: name.loc};
			if (this.tokenizer.presume('=', true)) {
				v.init = this.parseExpression(Mode_ExpressionWithoutComma);
//				v.loc.end = this.tokenizer.lookback().loc.end;
//			} else {
//				v.loc.end = name.loc.end;
			}
			declarations.push(v);
		} while( this.tokenizer.presume(',', true) );

		var endloc = this.tokenizer.location();
		init = {
			type: "VariableDeclaration",
			declarations: declarations,
			kind: "var",
			loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
		};
	} else {
		init = this.parseExpression(Mode_Expression);
		if (init.type === "BinaryExpression" && init.operator === "in") {
			this.tokenizer.expect(")");
			var code = this.parseStatementOrBlockStatement();
			var endloc = this.tokenizer.location();
			return {
				type: "ForInStatement",
				left: init.left,
				right: init.right,
				body: code,
				each: false,
				loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
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
	var endloc = this.tokenizer.location();
	return {
		type: "ForStatement",
		init: init,
		test: test,
		update: update,
		body: code,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function whileParser() {
	var loc = this.tokenizer.location();
	this.tokenizer.expect("(");
	var args = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(")");
	var code = this.parseStatementOrBlockStatement();
	var endloc = this.tokenizer.location();
	return {
		type: "WhileStatement",
		test: args,
		body: code,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function ifParser() {
	var loc = this.tokenizer.location();
	this.tokenizer.expect("(");
	var args = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(")");
	var code = this.parseStatementOrBlockStatement();
	var alternate = null;
	if (this.tokenizer.presume('else', true)) {
		alternate = this.parseStatementOrBlockStatement();
	}
	var endloc = this.tokenizer.location();
	return {
		type: "IfStatement",
		test: args,
		consequent: code,
		alternate: alternate,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function switchParser() {
	var loc = this.tokenizer.location();
	this.tokenizer.expect('(');
	var discriminant = this.parseExpression();
	this.tokenizer.expect(')');
	var cases = [];
	this.tokenizer.expect('{');
	while(this.tokenizer.lookahead() !== null && !this.tokenizer.presume('}', false)) {
		var token, test;
		if (token = this.tokenizer.presume("case", true)) {
			test = this.parseExpression(Mode_ExpressionWithoutColon);
			this.tokenizer.expect(":");
		} else if (token = this.tokenizer.presume("default", true)) {
			this.tokenizer.expect(":");
			test = null;
		} else {
			this.throwError(this.tokenizer.lookahead(), errors.Messages.UnexpectedToken, this.tokenizer.lookahead().value);
		}
		var consequent = [];
		while( this.tokenizer.lookahead() !== null && !this.tokenizer.presume('case', false) && !this.tokenizer.presume('default', false) && !this.tokenizer.presume('}', false)) {
			consequent = consequent.concat(this.parseStatement());
		}
		cases.push( {type: "SwitchCase", test: test, consequent: consequent, loc: token.loc} );
	}
	this.tokenizer.expect('}');
	var endloc = this.tokenizer.location();
	return {
		type: "SwitchStatement",
		discriminant: discriminant,
		cases: cases,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function returnParser() {
	var loc = this.tokenizer.location();
	var argument = this.parseExpressionStatement();
	if (argument !== null) {
		argument = argument.expression;
	}
	var endloc = this.tokenizer.location();
	return {
		type: "ReturnStatement",
		argument: argument,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function breakParser() {
	var loc = this.tokenizer.location();
	var name = this.tokenizer.presumeIdentifier(true);
	var endloc = this.tokenizer.location();
	this.parseEndOfStatement();
	return {
		type: "BreakStatement",
		label: name === null ? null : {type: "Identifier", name: name.value, loc: name.loc},
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function continueParser() {
	var loc = this.tokenizer.location();
	var name = this.tokenizer.presumeIdentifier(true);
	var endloc = this.tokenizer.location();
	this.parseEndOfStatement();
	return {
		type: "ContinueStatement",
		label: name === null ? null : {type: "Identifier", name: name.value, loc: name.loc},
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function throwParser() {
	var loc = this.tokenizer.location();
	var expression = this.parseExpressionStatement();
	if (expression === null) {
		this.throwError(null, errors.Messages.NewlineAfterThrow);
	}
	var endloc = this.tokenizer.location();
	return {
		type: "ThrowStatement",
		argument: expression.expression,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function varParser() {
	var loc = this.tokenizer.location();
	var declarations = [];
	do {
		var name = this.parseIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: name, loc: name.loc};
		if (this.tokenizer.presume('=', true)) {
			v.init = this.parseExpression(Mode_ExpressionWithoutComma);
//			v.loc.end = this.tokenizer.lookback().loc.end;
//		} else {
//			v.loc.end = name.loc.end;
		}
		declarations.push(v);
	} while( this.tokenizer.presume(',', true) );
	var endloc = this.tokenizer.location();
	this.parseEndOfStatement();
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "var",
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function letParser() {
	var loc = this.tokenizer.location();
	var declarations = [];
	do {
		var name = this.parseIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: name, loc: name.loc};
		if (this.tokenizer.presume('=', true)) {
			v.init = this.parseExpression(Mode_ExpressionWithoutComma);
//			v.loc.end = this.tokenizer.lookback().loc.end;
//		} else {
//			v.loc.end = name.loc.end;
		}
		declarations.push(v);
	} while( this.tokenizer.presume(',', true) );
	var endloc = this.tokenizer.location();
	this.parseEndOfStatement();
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "let",
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function constParser() {
	var loc = this.tokenizer.location();
	var declarations = [];
	do {
		var name = this.parseIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: name, loc: name.loc};
		this.tokenizer.expect('=');
		v.init = this.parseExpression(Mode_ExpressionWithoutComma);
//		v.loc.end = this.tokenizer.lookback().loc.end;
		declarations.push(v);
	} while( this.tokenizer.presume(',', true) );
	var endloc = this.tokenizer.location();
	this.parseEndOfStatement();
	return {
		type: "VariableDeclaration",
		declarations: declarations,
		kind: "const",
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function doParser() {
	var loc = this.tokenizer.location();
	var code = this.parseBlockStatement();
	this.tokenizer.expect('while');
	this.tokenizer.expect("(");
	var args = this.parseExpression(Mode_Expression);
	this.tokenizer.expect(")");
	var endloc = this.tokenizer.location();
	this.parseEndOfStatement();
	return {
		type: "DoWhileStatement",
		test: args,
		body: code,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function tryCatchParser() {
	var loc = this.tokenizer.location();
	var block = this.parseBlockStatement();
	var handlers = [];
	var guardedHandlers = [];
	var finalizer = null;
	var c;
	while (c = this.tokenizer.presume('catch', true)) {
		this.tokenizer.expect("(");
		var param = this.parserIdentifier();
		this.tokenizer.expect(")");
		var body = this.parseBlockStatement();
		var handler = {type: "CatchClause", body: body, param: param, loc: c.loc};
		handlers.push(handler);
	}
	if (this.tokenizer.presume('finally', true)) {
		finalizer = this.parseBlockStatement();
	}
	if (handlers.length === 0 && finalizer === null) {
		this.throwError(token, errors.Messages.NoCatchOrFinally);
	}
	var endloc = this.tokenizer.location();
	return {
		type: "TryStatement",
		block: block,
		handlers: handlers,
		guardedHandlers: guardedHandlers,
		finalizer : finalizer,
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc}
	};
}

function debuggerParser() {
	var loc = this.tokenizer.location();
	return {
		type: "DebuggerStatement",
		loc: {source: loc.filename, start: loc.loc, end: loc.loc}
	};
}

function importParser() {
	// Parse the import statement
	var loc = this.tokenizer.location();
	var name = this.tokenizer.next();
	if (!name || name.type !== "String") {
		this.throwError(name, "Expected string after 'import'");
	}
	var as;
	if (this.tokenizer.presume('as', true)) {
		as = this.parseIdentifier();
	} else {
		// Infer a module name from the path
		var filename = name.value;
		if (name.value.indexOf('/') !== -1 || name.value.indexOf('\\') !== -1) {
			filename = name.value.replace(/^.*[\\\/]/, '')
		}
		filename = filename.replace(/\.js$/, '');
		if (filename === "") {
			this.throwError(name, "Invalid name for an import path");
		}
		if (this.tokenizer.isReservedWord(filename)) {
			filename = "__" + filename;
		}
		as = {
			name: filename,
			loc: name.loc
		};
	}
	this.parseEndOfStatement();

	// Try to locate the JS file
//	try {
//		var jsfile = require.resolve(name.value);
//	} catch(err) {
//		this.throwError(name, Messages.UnknownModule, name.value);
//	}
	var tmp = this.compiler.resolveModule(this, name.value);
	// Import the gismo module
	var p = path.dirname(tmp.jsfile);
//	var path = jsfile.substr(0, jsfile.lastIndexOf('/') + 1);
	this.importModuleRunning = true;
	try {
		this.compiler.importMetaModule(this, p, as.name);
	} catch(err) {
		if (err instanceof errors.SyntaxError || err instanceof errors.CompilerError) {
			throw err;
		}
		this.throwError(name, errors.Messages.ImportFailed, name.value, err.toString());
	}
	this.importModuleRunning = false;

	var endloc = this.tokenizer.location();
	return {
		loc: {source: loc.filename, start: loc.loc, end: endloc.loc},
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": as.name,
                    loc: as.loc
                },
                "init": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "Identifier",
                        "name": "require"
                    },
                    "arguments": [
                        {
                            "type": "Literal",
                            "value": tmp.modulePath,
                            loc: name.loc
                        }
                    ]
                }
            }
        ],
        "kind": "var"
    };
}

function exportParser() {
	var loc = this.tokenizer.location();
	var statements = [].concat(this.parseStatement());
	var exported = false;
	for(var i = 0; i < statements.length; i++) {
		var s = statements[i];
		switch (s.type) {
			case "FunctionDeclaration":
				exported = true;
				var code = {
		            "type": "ExpressionStatement",
		            "expression": {
		                "type": "AssignmentExpression",
		                "operator": "=",
		                "left": {
		                    "type": "MemberExpression",
		                    "computed": false,
		                    "object": {
		                        "type": "Identifier",
		                        "name": "exports"
		                    },
		                    "property": {
		                        "type": "Identifier",
		                        "name": s.id.name
		                    }
		                },
		                "right": {
		                    "type": "Identifier",
		                    "name": s.id.name
		                }
		            }
		        }
		        statements.push(code);
				break;
			case "VariableDeclaration":
				exported = true;
				for(var k = 0; k < s.declarations.length; k++) {
					var code = {
			            "type": "ExpressionStatement",
			            "expression": {
			                "type": "AssignmentExpression",
			                "operator": "=",
			                "left": {
			                    "type": "MemberExpression",
			                    "computed": false,
			                    "object": {
			                        "type": "Identifier",
			                        "name": "exports"
			                    },
			                    "property": {
			                        "type": "Identifier",
			                        "name": s.declarations[k].id.name
			                    }
			                },
			                "right": {
			                    "type": "Identifier",
			                    "name": s.declarations[k].id.name
			                }
			            }
			        }
    		        statements.push(code);
				}
				break;
			case "ExpressionStatement":
				if (s.expression.type === "CallExpression" && s.expression.callee.type === "MemberExpression" && !s.expression.callee.computed && s.expression.callee.object.name === "parser" && s.expression.callee.property.name === "extendSyntax") {
					exported = true;
					s.expression.callee.property.name = "exportAndExtendSyntax";
				}
		}
	}
	if (!exported) {
		this.throwError(null, errors.Messages.CannotExport);
	}
	return statements;
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
		return null;
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
		return null;
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
		if (value === null && state.op !== expressionOperator) {
			if (lookahead !== null) {
				this.throwError(lookahead, errors.Messages.UnexpectedToken, lookahead.value);
			}
			this.throwError(lookahead, errors.Messages.UnexpectedEOS);
		}
		if (state.op.associativity === "ur") {
			if (state.op.generator) {
				state.value = this.execUnaryGenerator(state.op.generator, value);
			} else {
				state.value.argument = value;
			}
		} else if (state.op.associativity === "bl" || state.op.associativity === "br") {
			if (state.op.generator) {
				state.value = this.execBinaryGenerator(state.op.generator, state.value.left, value);
			} else if (state.op.value === ',') {
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
			throw new Error("Internal Error: Unknown state in upward recursion");
		}
//		console.log("      value changes from", value, "to", state.value);
		value = state.value;
	}
	return value;
};

Parser.prototype.parseTerm = function() {
	return this.parseExpression(Mode_Term);
};

Parser.prototype.parseIdentifier = function() {
	var ident = this.tokenizer.presumeIdentifier(true);
	if (ident) {
		return {type: "Identifier", name: ident.value, loc: ident.loc};
	}
	var token = this.tokenizer.lookahead();
	ident = this.parseExpression(Mode_Term);
	if (!ident || ident.type !== "Identifier") {
		this.throwError(token, errors.Messages.UnexpectedToken, token.value);
	}
	return ident;
};

Parser.prototype.parseArrayExpression = function() {
	var elements = [];
	var loc1 = this.tokenizer.location();
	while(this.tokenizer.lookahead() !== null && this.tokenizer.lookahead().value !== ']') {
		elements.push(this.parseExpression(Mode_ExpressionWithoutComma));
		if (!this.tokenizer.presume(",", true)) {
			break;
		}
	}
	var loc2 = this.tokenizer.expect("]").loc;
	return {type: "ArrayExpression", elements: elements, loc: {source: loc1.filename, start: loc1.loc, end: loc2.end}};
}

Parser.prototype.parseObjectExpression = function() {
	var properties = [];
	var locbegin = this.tokenizer.location();
	while(this.tokenizer.lookahead() !== null && this.tokenizer.lookahead().value !== '}') {
		var lookahead = this.tokenizer.lookahead();
		var loc1 = lookahead.loc;
		var prop = {type: "Property"};
		var token = this.tokenizer.next();
		if (token === null) {
			this.throwError(token, errors.Messages.UnexpectedEOS);
		}
		var lookahead = this.tokenizer.lookahead();
		if (token.type === "Identifier" && (token.value === "get" || token.value === "set") && lookahead !== null && (lookahead.type === "Identifier" || lookahead.type === "String")) {
			var name = this.tokenizer.next();
			if (name.type === "Identifier") {
				prop.key = {type: "Identifier", name: name.value, loc: name.loc };
			} else {
				prop.key = {type: "Literal", value: name.value, loc: name.loc };
			}
			var parameters = [];
			this.tokenizer.expect("(");
			var parameters = this.parseExpression(Mode_Expression);
			if (parameters === null) {
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
				this.throwError(token, errors.Messages.UnexpectedToken, token.value);
			}
			this.tokenizer.expect(":");
			prop.value = this.parseExpression(Mode_ExpressionWithoutComma);
			prop.kind = "init";
		}
		var loc2 = this.tokenizer.location();
		prop.loc = {source: loc1.source, start: loc1.start, end: loc2.loc};
		properties.push(prop);
		if (!this.tokenizer.presume(",", true)) {
			break;
		}
	}
	var locend = this.tokenizer.expect("}").loc;
	return {type: "ObjectExpression", properties: properties, loc: {source: locbegin.filename, start: locbegin.loc, end: locend.end}};
}

Parser.prototype.parseExpression = function(mode) {
	if (!mode) {
		mode = Mode_Expression;
	}
	var stack = [];
	var value, lookahead;
	var state = {op: expressionOperator};
	var token = {value: "expression", loc: {start: {line: 0}, end: {line: 0}}};
	var bracketCount = 0;

	do {
		// Process the current token (token[index]) with the current operator (state.op)
		if (state.op.generator && state.op.associativity === "none") {
//			console.log(token.value, "parser");
			value = this.execGenerator(state.op.generator);
		} else if (state.op.bracket && state.op.associativity === "none") {
//			console.log(token.value, "bracket");
			if (state.op.value === '{') {
				value = this.parseObjectExpression();
			} else if (state.op.value === '[') {
				value = this.parseArrayExpression();

			} else {
				state.value = {operator: state.op.value};
				stack.push(state);
				value = null;
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
			value = null;
			bracketCount++;
		} else if (state.op.closingBracket) {
//			console.log(token.value, "closing_bracket");
			value = this.finishRecursions(-1 ,stack, value, lookahead);
			if (stack.length === 0 || stack[stack.length - 1].op.correspondingBracket !== state.op.value) {
				this.throwError(null, errors.Messages.UnexpectedToken, state.op.value);
			}
			if (stack[stack.length - 1].op.value === '(' && stack[stack.length - 1].op.associativity === "ul") {
				if (stack[stack.length - 1].op.generator) {
					// TODO
				} else if (value && value.type === "SequenceExpression") {
					stack[stack.length - 1].value.arguments = value.expressions;
				} else if (value) {
					stack[stack.length - 1].value.arguments = [value];
				} else {
					stack[stack.length - 1].value.arguments = [];
				}
				value = stack[stack.length - 1].value;
			} else if (stack[stack.length - 1].op.value === '[' && stack[stack.length - 1].op.associativity === "ul") {
				if (stack[stack.length - 1].op.generator) {
					// TODO
				}
				if (value === null) {
					this.throwError(null, errors.Messages.UnexpectedToken, ']');
				}
				stack[stack.length - 1].value.property = value;
				value = stack[stack.length - 1].value;
			} else if (stack[stack.length - 1].op.value === '(' && stack[stack.length - 1].op.associativity === "none") {
				// Do not change value by intention
				if (stack[stack.length - 1].op.generator) {
					value = thios.execUnaryGenerator(stack[stack.length - 1].op.generator, value);
				}
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
			if (state.op.generator) {
				value = this.execUnaryGenerator(state.op.generator, value);
			} else {
				value = {operator: state.op.value, argument: value, prefix: false, loc: token.loc, type: state.op.value === "++" || state.op.value === "--" ? "UpdateExpression" : "UnaryExpression"};
			}
		} else if (state.op.associativity === "ur") {
//			console.log(token.value, "ur");
			state.value = {operator: state.op.value, prefix: true, type: "UnaryExpression", loc: token.loc};
			stack.push(state);
			value = null;
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
			value = null;
		} else {
			throw new Error("Internal Error: Unknown state in loop");
		}

		// Determine the next operator based on the next token (if there is any)
		lookahead = this.tokenizer.lookahead();

		// Reached EOF?
		if (lookahead === null) {
			if (state.op.closingBracket) {
				stack.pop();
			}
			break;
		}

		if (mode === Mode_Term && state.op.associativity === "none" && bracketCount === 0) {
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
			value = null;
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
			value = null;
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
			value = null;
		} else {
			throw new Error("Internal Error: Unknown state in loop");
		}

		// Expressions stop at a colon
		if (lookahead.value === ";" && lookahead.type !== "String" && bracketCount === 0) {
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
		if (this.tokenizer.lookahead() === null) {
			this.throwError(null, errors.Messages.UnexpectedEOS);
		}
		this.throwError(this.tokenizer.lookahead(), errors.Messages.UnexpectedToken, this.tokenizer.lookahead());
	}
//	if (mode === Mode_Default && this.tokenizer.lookahead() !== undefined) {
//		throw "Unexpected symbol '" + this.tokenizer.lookahead().value + "'";
//	}
//	if (value.argument === null) {
//		this.throwError(lookahead, errors.Messages.UnexpectedToken, lookahead.value);
//	}
	return value.argument;
};

Parser.prototype.parseStatementOrBlockStatement = function() {
	if (this.tokenizer.lookahead().value === "{") {
		return this.parseBlockStatement();
	}
	var s = this.parseStatement();
	if (s.length !== undefined) {
		return {
			type: "BlockStatement",
			body: s
		};
	}
	return s;
};

Parser.prototype.parseBlockStatement = function() {
	var loc1 = this.tokenizer.expect("{").loc;
	var statements = this.parseStatements();
	var loc2 = this.tokenizer.expect("}").loc;
	return {type: "BlockStatement", body: statements, loc: {source: loc1.source, start: loc1.start, end: loc2.end}};
};

Parser.prototype.parseExpressionStatement = function() {
	var lookahead = this.tokenizer.lookahead();
	if (lookahead === null) {
		return null;
	}
	var result;
	var body = this.parseExpression(Mode_Expression);
	var locend = this.tokenizer.location();
	if (body === null) {
		this.tokenizer.expect(';');
		result = {type: "EmptyStatement", loc: {source: lookahead.loc.source, start: lookahead.loc.start, end: locend.loc}};
	} else {
		result = { type: "ExpressionStatement", expression: body, loc: {source: lookahead.loc.source, start: lookahead.loc.start, end: locend}};
		this.parseEndOfStatement();
	}
	return result;
}

Parser.prototype.parseEndOfStatement = function() {
	// Determine the end of the statement. It must either be ';', a new line, or a closing bracket
	var line = this.tokenizer.location().lineNumber;
	var lookahead = this.tokenizer.lookahead();
	if (lookahead === null || lookahead.value === '}' || lookahead.value === ')' || lookahead.value === ']') {
		// Do nothing by intention
	} else if (lookahead.value === ";" && lookahead.type !== "String") {
		this.tokenizer.next();
	} else {
//		var lookback = this.tokenizer.lookback();
//		if (!lookback || lookback.loc.end.line === lookahead.loc.start.line) {
		if (line === lookahead.loc.start.line) {
			this.throwError(null, "Expected ';'");
		}
	}
}

Parser.prototype.parseStatement = function() {
	var token = this.tokenizer.lookahead();
	var s = token.value;
	// Is this a  statement?
	var p = token.type !== "String" ? this.statementKeywords[s] : null;
	if (p) {
		this.tokenizer.next();
		var result = this.execGenerator(p);
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
				return {type: "BlockStatement", body: result, loc: {source: result[0].loc.source, start: result[0].loc.start, end: result[result.length - 1].loc.end}};
			}
		} else if (typeof result === "object") {
			// TODO: Check that the object tree is ok
		} else {
			console.log(JSON.stringify(result, null, "\t"))
			this.throwError(token, "Parser for statement '" + s + "' must return a string or an AST object");
		}
		return result;
	} else if (token.value === '{') {
		return this.parseBlockStatement();
	}
	return this.parseExpressionStatement();
}

Parser.prototype.parseTopLevelStatements = function() {
	return { type: "Program", body: this.parseStatements()};
}

Parser.prototype.parseStatements = function() {
	var result = [];
	while( this.tokenizer.lookahead() !== null && this.tokenizer.lookahead().value !== '}') {
		var body = this.parseStatement();
		result = result.concat(body);
	}
	return result;
}

Parser.prototype.parse = function(tokenizer) {
	this.tokenizer = tokenizer;
	for(var i = 0; i < this.keywords.length; i++) {
		this.tokenizer.registerKeyword(this.keywords[i]);
	}
	for(var i = 0; i < this.punctuators.length; i++) {
		this.tokenizer.registerPunctuator(this.punctuators[i]);
	}

	var result = [];
	// TODO: Why does this stop at '}' ?
	while( this.tokenizer.lookahead() !== null && this.tokenizer.lookahead().value !== '}') {
		var body = this.parseStatement();
		result = result.concat(body);
	}

	return result;
}

// modulePath is optional
Parser.prototype.importAlias = function(m) {
	return this.compiler.importAlias(m);
};

Parser.prototype.removeSyntax = function(s) {
	switch (s.type) {
		case "operator":
			var i = this.punctuators.indexOf(s.name);
			if (i != -1) {
				this.punctuators.splice(i,1);
			}
			var ops = this.operators[s.name];
			if (ops) {
				var associativity;
				switch (s.associativity) {
					case "none":
						associativity = "none";
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
						throw new Error("ExtensionError: Unknown associativity '" + s.associativity + "'");
				}
				for(var i = 0; i < ops.length; i++) {
					if (ops[i].associativity === associativity) {
						ops.splice(i,1);
						break;
					}
				}
			}
			break;
		case "statement":
			var i = this.keywords.indexOf(s.name);
			if (i != -1) {
				this.keywords.splice(i,1);
			}
			delete this.statementKeywords[s.name];
			break;
		default:
			throw new Error("Unknown syntax extension");
	}
};

Parser.prototype.exportAndExtendSyntax = function(s) {
	switch (s.type) {
		case "operator":
			this.newOperator(s);
			break;
		case "statement":
			this.newStatement(s);
			break;
		default:
			throw new Error("Unknown syntax extension");
	}
};

Parser.prototype.extendSyntax = function(s) {
	// When importing a module, use only exported syntax elements. Ignore everything else
	if (this.importModuleRunning) {
		return;
	}
	this.exportAndExtendSyntax(s);
};

Parser.prototype.newStatement = function(s) {
	if (this.statementKeywords[s.name]) {
		throw new Error("Conflicting statement '" + s.name + "', defined in " + this.statementKeywords[s.name].module + " and redefined in " + this.importModuleName);
	}
	this.statementKeywords[s.name] = s.generator;
	s.generator.module = this.importModuleName;

	if (!lexer.isIdentifier(s.name)) {
		// The new operator has to be a punctuator
		if (s.name == "" || lexer.isIdentifierStart(s.name[0])) {
			throw new Error("Statement name '" + s.name + "' is neither a valid identifier nor a punctuator");
		}
		this.punctuators.push(s.name);
		if (this.tokenizer) {
			this.tokenizer.registerPunctuator(s.name);
		}
	}
}

Parser.prototype.newOperator = function(s) {
	// TODO: Check conflicts with existing operands or operators
	var associativity = "none";
	var level = s.level;
	if (typeof level !== "number") {
		throw new Error("ExtensionError: A numeric precedence level must be specified");
	}
	switch (s.associativity) {
		case "none":
//			if (level === undefined) {
//				level = this.numericTerminal.level;
//			}
			break;
		case "right":
//			if (level === undefined) {
//				level = 16; // TODO
//			}
			associativity = "ur";
			break;
		case "left":
//			if (level === undefined) {
//				level = 16; // TODO
//			}
			associativity = "ul";
			break;
		case "binary":
		case "binary-left":
//			if (level === undefined) {
//				level = 16; // TODO
//			}
			associativity = "bl";
			break;
		case "binary-right":
//			if (level === undefined) {
//				level = 16; // TODO
//			}
			associativity = "br";
			break;
		default:
			throw new Error("ExtensionError: Unknown associativity '" + s.associativity + "'");
	}

	// The new operator is an identifier?
	var op;
	if (lexer.isIdentifier(s.name)) {
		this.keywords.push(s.name);
		if (this.tokenizer) {
			this.tokenizer.registerKeyword(s.name);
		}
		op = {
			associativity: associativity,
			value: s.name,
			type: "Keyword",
			generator: s.generator,
			level: level,
			module: this.importModuleName
		};
	} else {
		// The new operator has to be a punctuator
		if (s.name == "" || lexer.isIdentifierStart(s.name[0])) {
			throw new Error("Operator name '" + s.name + "' is neither a valid identifier nor a punctuator");
		}

		this.punctuators.push(s.name);
		if (this.tokenizer) {
			this.tokenizer.registerPunctuator(s.name);
		}
		var op = {
			associativity: associativity,
			value: s.name,
			type: "Punctuator",
			generator: s.generator,
			level: level,
			module: this.importModuleName
		};
	}

	if (this.operators[s.name]) {
		// TODO: Check conflicts with existing operands or operators
		var existingOps = this.operators[s.name];
		for(var i = 0; i < existingOps.length; i++) {
			var existingOp = existingOps[i];
			if (existingOp.associativity === "none" || op.associativity === "none" || op.associativity === existingOp.associativity) {
				throw new Error("Conflicting operator '" + s.name + "', defined in " + existingOp.module + " and redefined in " + op.module);
			}
			if (((existingOp.associativity === "bl" || existingOp.associativity === "br") && op.associativity == "ul" && op.level != existingOp.level) ||
				((op.associativity === "bl" || op.associativity === "br") && existingOp.associativity == "ul" && op.level != existingOp.level)) {
				throw new Error("The operator exists as infix and postfix. Both must have the same precedence");
			}
		}
		this.operators[s.name].push(op);
	} else {
		this.operators[s.name] = [op];
	}
};

Parser.prototype.storeContext = function() {
	this.tokenizer.storeContext();
	this.contextStack.push({operators: this.operators, statementKeywords: this.statementKeywords, punctuators: this.punctuators, keywords: this.keywords});
	this.punctuators = this.punctuators.slice(0);
	this.keywords = this.keywords.slice(0);
	var kw = {};
	for(var key in this.statementKeywords) {
		kw[key] = this.statementKeywords[key];
	}
	this.statementKeywords = kw;
	var ops = {};
	for(var key in this.operators) {
		ops[key] = this.operators[key].slice(0);
	}
	this.operators = ops;
};

Parser.prototype.restoreContext = function() {
	this.tokenizer.restoreContext();
	var c = this.contextStack.pop();
	this.operators = c.operators;
	this.statementKeywords = c.statementKeywords;
	this.keywords = c.keywords;
	this.punctuators = c.punctuators;
};

Parser.prototype.isIdentifierStart = lexer.isIdentifierStart;
Parser.prototype.isIdentifierPart = lexer.isIdentifierPart;
Parser.prototype.isIdentifier = lexer.isIdentifier;
Parser.prototype.isDecimalDigit = lexer.isDecimalDigit;
Parser.prototype.isHexDigit = lexer.isHexDigit;
Parser.prototype.isOctalDigit = lexer.isOctalDigit;
Parser.prototype.isWhiteSpace = lexer.isWhiteSpace
Parser.prototype.isLineTerminator = lexer.isLineTerminator;

Parser.prototype.execGenerator = function(generator) {
	try {
		return generator();
	} catch(err) {
		if (err instanceof errors.SyntaxError) {
			throw err;
		}
		var e = new errors.CompilerError(err.toString());
		e.stack = err.stack;
		throw e;
	}
};

Parser.prototype.execUnaryGenerator = function(generator, a) {
	try {
		return generator(a);
	} catch(err) {
		if (err instanceof errors.SyntaxError) {
			throw err;
		}
		var e = new errors.CompilerError(err.toString());
		e.stack = err.stack;
		throw e;
	}
};

Parser.prototype.execBinaryGenerator = function(generator, a, b) {
	try {
		return generator(a, b);
	} catch(err) {
		if (err instanceof errors.SyntaxError) {
			throw err;
		}
		var e = new errors.CompilerError(err.toString());
		e.stack = err.stack;
		throw e;
	}
};

Parser.prototype.throwError = function(token, messageFormat) {
    var error,
        args = Array.prototype.slice.call(arguments, 2),
        msg = messageFormat.replace(
            /%(\d)/g,
            function (whole, index) {
                if (index >= args.length)
                	throw new Error('Implementation Error: Message reference must be in range');
                return args[index];
            }
        );

	var loc = this.tokenizer.location();
    if (token && typeof token.lineNumber === 'number') {
        error = new errors.SyntaxError(loc.filename + ':' + token.lineNumber + ':' + (token.start - token.lineStart + 1) + ': ' + msg);
        error.type = errors.ErrorType.SyntaxError;
        error.index = token.start;
        error.lineNumber = token.lineNumber;
        error.column = token.start - token.lineStart + 1;
        error.filename = token.source;
    } else {
        error = new errors.SyntaxError(loc.filename + ':' + loc.lineNumber + ':' + loc.column + ': ' + msg);
        error.type = errors.ErrorType.SyntaxError;
        error.index = loc.index;
        error.lineNumber = loc.lineNumber;
        error.column = loc.column;
        error.filename = loc.source;
    }

    error.description = msg;
    throw error;
}

exports.Parser = Parser;
