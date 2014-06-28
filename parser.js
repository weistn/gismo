// var esprima = require('esprima');
var lexer = require("./lexer.js");
var escodegen = require('escodegen');
var errors = require("./errors");

// Parses an expression up to the point where the next symbol cannot be added to the expression any more.
var	Mode_Expression = 1,
	Mode_ExpressionWithoutComma = 2,
	// Parses an expression, but stops at call operation. Required when parsing "new ... ()"" since "..." must not contain
	// a function call at top-level.
	Mode_ExpressionWithoutCall = 3,
	Mode_ExpressionWithoutColon = 4,
	Mode_Term = 5

function Parser(compiler) {
	this.compiler = compiler;
	this.keywords = [];
	this.punctuators = [];

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

function functionParser() {
	var loc = this.tokenizer.lookback().loc;
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
		loc: loc,
		generator: generator
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

function conditionalParser(test) {
	var loc = this.tokenizer.lookback().loc;
	var consequent = this.parseExpression(Mode_ExpressionWithoutColon);
	this.tokenizer.expect(':');
	var alternate = this.parseExpression(Mode_Expression);
	return {
		type: "ConditionalExpression",
		test: test,
		consequent: consequent,
		alternate: alternate,
		loc: loc
	};
}

function functionDeclParser() {
	var loc = this.tokenizer.lookback().loc;
	var generator = false;
	if (this.tokenizer.presume("*", true)) {
		generator = true;
	}
	var name = this.parseIdentifier();
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
		loc: loc,
		generator: generator
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
			var name = this.parseIdentifier();
			if (count === 1 && this.tokenizer.presume("in", true)) {
				var left = {type: "VariableDeclaration", loc: vartoken.loc, kind: "var", declarations: [{type: "VariableDeclarator", loc: name.loc, init: null, id: name}]};
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
			var v = {type: "VariableDeclarator", init: null, id: name, loc: {start: name.loc.start}};
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
			this.throwError(this.tokenizer.lookahead(), errors.Messages.UnexpectedToken, this.tokenizer.lookahead().value);
		}
		var consequent = [];
		while( this.tokenizer.lookahead() !== undefined && !this.tokenizer.presume('case', false) && !this.tokenizer.presume('default', false) && !this.tokenizer.presume('}', false)) {
			consequent = consequent.concat(this.parseStatement());
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
		this.throwError(this.tokenizer.lookback(), errors.Messages.NewlineAfterThrow);
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
		var name = this.parseIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: name, loc: {start: name.loc.start}};
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
		var name = this.parseIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: name, loc: {start: name.loc.start}};
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
		var name = this.parseIdentifier();
		var v = {type: "VariableDeclarator", init: null, id: name, loc: {start: name.loc.start}};
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
	var token = this.tokenizer.lookback();
	var loc = token.loc;
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
	var token = this.tokenizer.lookback();
	var loc = token.loc;
	var name = this.tokenizer.next();
	if (!name || name.type !== "String") {
		this.throwError(token, "Expected string after 'import'");
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
		as = {
			name: filename,
			loc: name.loc
		};
	}
	this.parseEndOfStatement();

	// Try to locate the JS file
	try {
		var jsfile = require.resolve(name.value);
	} catch(err) {
		this.throwError(name, Messages.UnknownModule, name.value);
	}
	// Import the gismo module
	var path = jsfile.substr(0, jsfile.lastIndexOf('/') + 1);
	this.importModuleRunning = true;
	try {
		this.compiler.importMetaModule(path, as.name);
	} catch(err) {
		if (err instanceof errors.SyntaxError || err instanceof errors.CompilerError) {
			throw err;
		}
		this.throwError(name, errors.Messages.ImportFailed, name.value, err.toString());
	}
	this.importModuleRunning = false;

	return {
		loc: loc,
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

function exportParser() {
	var token = this.tokenizer.lookback();
	var loc = token.loc;
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
		this.throwError(token, errors.Messages.CannotExport);
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
				state.value = this.execBinaryGenerator(state.op.generator, state.value, value);
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
	var ident = this.parseExpression(Mode_Term);
	if (!ident || ident.type !== "Identifier") {
		this.throwError(token, errors.Messages.UnexpectedToken, token.value);
	}
	return ident;
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
			this.throwError(token, errors.Messages.UnexpectedEOS);
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
				this.throwError(token, errors.Messages.UnexpectedToken, token.value);
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
				this.throwError(this.tokenizer.lookback(), errors.Messages.UnexpectedToken, state.op.value);
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
				if (value === undefined) {
					this.throwError(this.tokenizer.lookback(), errors.Messages.UnexpectedToken, ']');
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
			throw new Error("Internal Error: Unknown state in loop");
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
			throw new Error("Internal Error: Unknown state in loop");
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
			this.throwError(undefined, errors.Messages.UnexpectedEOS);
		}
		this.throwError(this.tokenizer.lookahead(), errors.Messages.UnexpectedToken, this.tokenizer.lookahead());
	}
//	if (mode === Mode_Default && this.tokenizer.lookahead() !== undefined) {
//		throw "Unexpected symbol '" + this.tokenizer.lookahead().value + "'";
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
	return {type: "BlockStatement", body: statements, loc: {start: loc1.start, end: loc2.end}};
};

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
			this.throwError(lookback, "Expected ';'");
		}
	}
}

Parser.prototype.parseStatement = function() {
	var token = this.tokenizer.lookahead();
	var s = token.value;
	var p = this.statementKeywords[s];
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
				return {type: "BlockStatement", body: result, loc: {start: result[0].loc.start, end: result[result.length - 1].loc.end}};
			}
		} else if (typeof result === "object") {
			// TODO: Check that the object tree is ok
		} else {
			this.throwError(token, "Parser for statement '" + s + "' must return a string or an AST object");
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
	while( this.tokenizer.lookahead() !== undefined && this.tokenizer.lookahead().value !== '}') {
		var body = this.parseStatement();
		result = result.concat(body);
	}

	return result;
}

// modulePath is optional
Parser.prototype.importAlias = function(m) {
	return this.compiler.importAlias(m);
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
			throw new Error("Unsupported syntax extension in imported module '" + path + "'");
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
		throw new Error("ExtensionError: Statement has already been registered: '" + s.name + "'");
	}
	this.statementKeywords[s.name] = s.generator;
}

Parser.prototype.newOperator = function(s) {
	// TODO: Check conflicts with existing operands or operators
	var associativity = "none";
	var level = s.level;
	switch (s.associativity) {
		case "none":
			if (level === undefined) {
				level = this.numericTerminal.level;
			}
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

	if (lexer.isIdentifier(s.name)) {
		// TODO: Check conflicts with existing operands or operators
		this.keywords.push(s.name);
		if (this.tokenizer) {
			this.tokenizer.registerKeyword(s.name);
		}
		var op = {
			associativity: associativity,
			value: s.name,
			type: "Keyword",
			generator: s.generator,
			level: level
		};
		if (this.operators[s.name]) {
			this.operators[s.name].push(op);
		} else {
			this.operators[s.name] = [op];
		}
		return;
	}
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
		level: level
	};	
	if (this.operators[s.name]) {
		this.operators[s.name].push(op);
	} else {
		this.operators[s.name] = [op];
	}
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

    if (token && typeof token.lineNumber === 'number') {
        error = new errors.SyntaxError(this.tokenizer.location().filename + ':' + token.lineNumber + ':' + (token.start - token.lineStart + 1) + ': ' + msg);
        error.type = errors.ErrorType.SyntaxError;
        error.index = token.start;
        error.lineNumber = token.lineNumber;
        error.column = token.start - token.lineStart + 1;
    } else {
    	var loc = this.tokenizer.location();
        error = new errors.SyntaxError(this.tokenizer.loc.filename() + ':' + loc.lineNumber + ':' + loc.column + ': ' + msg);
        error.type = errors.ErrorType.SyntaxError;
        error.index = loc.index;
        error.lineNumber = loc.lineNumber;
        error.column = loc.column;
    }

    error.filename = this.tokenizer.location().filename;
    error.description = msg;
    throw error;
}

exports.Parser = Parser;
