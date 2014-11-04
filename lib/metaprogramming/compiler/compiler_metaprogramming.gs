import "gismo/template";

function isOperator(str) {
    if (parser.tokenizer.isIdentifierStart(str.charCodeAt(0))) {
        return parser.tokenizer.isIdentifier(str);
    }
    return true;
}

/// Defines a new operator.
/// An operator can have no associativity. Thus, it can be used everywhere where a JS-expression can be used.
/// You could, for example, define an operator named '@line'. Then you can write 'console.log("We are at" + @line)'.
/// Left-associative operators attach them selfes to an expression to their left, e.g. in 'a...' the '...' operator is left-associative.
/// Right-associative operators attach them selfes to an expression to their right, e.g. in '!a' the '!' operator is right-associative.
/// Binary-associative operators combine expressions to their left and right into one expression, e.g. in 'a+b' the '+' operator is binary-associative.
///
/// operator <name-of-operator> { <parser-function> }                                       // no associativity
/// operator <expr-placeholder> <name-of-operator> { <parser-function> }                    // left associativity
/// operator <name-of-operator> <expr-placeholder> { <parser-function> }                    // right associativity
/// operator <expr-placeholder> <name-of-operator> <expr-placeholder> { <parser-function> } // binary associativity
///
/// The name-of-statement is either a JS identifier (e.g. 'select' or 'foo12') or a sequence of characters which are neither white-spaces
/// nor are they characters that may appear in the beginning of a JS identifier (e.g. '///' or '@').
///
/// The expr-placeholder must be an identifier. This causes problems when distinguishing a left-associative from a right-associative operator
/// as shown by the following example:
///
/// operator select expr { ... }
///
/// This could either be a left-associative operator named 'expr' or a right-associative operator called 'select'.
/// Since right-associativity is more common, the conflict is resolved this way.
/// However, left-associativity can be enfored  by prepending the operator with a backslash, e.g. the following example
/// defines a left-associative operator named 'expr'.
///
/// operator select \expr { ... }
///
/// The parser-function has access to a variable named 'parser' and must scan until the end of the statement
/// including a trailing ';'. The parser-function must return an AST node or an array of AST nodes.
/// These returned AST nodes are put in the resulting AST to represent the parsed statement.
/// The parser-function has access to zero, one or two addition variables which are named by the <expr-placeholder>, e.g.
/// in the following example the parser-function has access to the variables 'a' and 'b'.
/// The two variables 'a' and 'b' contain the AST tree of the two expressions.
///
/// operator a + b { ... }
///
/// Sometimes it might be useful to define an operator with no associativity although the operator has some associativity.
/// For example, we want to realize the following code:
///
/// var cursor = select * from table;
///
/// Here the operator 'select' is right-associative. However, the default parser is not able to scan the exression to the right of 'select'
/// because this is SQL syntax and not JS syntax. Thus, we define the operator as 'operator select { ... }' and parse the reminder of the SQL statement
/// in the parser-function. From the viewpoint of the JS-parser the keyword 'select' starts an expression that is non-associative.
///
/// docHint: {"name": "operator", "category": "statement", "shortSignature": "statement operator", "longSignature": "statement operator"}
export parser.extendSyntax({
    type: 'statement',
    name: 'operator',
    generator: function() {
        var words = [];
        var ch;
        var parsed_precedence = false;
        for(var i = 0; i < 4; i++) {
            parser.tokenizer.skipWhitespace();
            var str = "";
            var j = 0;
            var isIdent = false;
            while(true) {
                ch = parser.tokenizer.peekChar();
//              console.log(ch, parser.tokenizer.location().index);
                // Break on { or EOF
                if (ch === null || ch === 123) {
                    break;
                }
                if (j === 0 && parser.tokenizer.isIdentifierStart(ch)) {
                    isIdent = true;
                } else if (j > 0 && isIdent && !parser.tokenizer.isIdentifierPart(ch)) {
                    break;
                } else if (j > 0 && !isIdent && parser.tokenizer.isIdentifierStart(ch)) {
                    break;
                }
                parser.tokenizer.nextChar();
                if (parser.tokenizer.isWhiteSpace(ch) || parser.tokenizer.isLineTerminator(ch)) {
                    break;
                }
                str += String.fromCharCode(ch);
                j++;
            }
            // Break on { or EOF or "precedence"
            if (ch === null || ch === 123) {
                break;
            }
            if (str === "precedence") {
                parsed_precedence = true;
                break;
            }
            words.push(str);
        }

        var params = [];
        var opname, associativity, precedence;
        switch (words.length) {
            case 0:
                parser.throwError(null, "Missing operator name");
            case 1:
                if (!isOperator(words[0])) {
                    parser.throwError(null, "The word '" + words[0] + "' is not a valid operator");
                }
//                console.log("none", words[0]);
                opname = words[0];
                associativity = "none";
                precedence = 17;
                break;
            case 2:
                ch = words[1].charCodeAt(0);
                if (!parser.tokenizer.isIdentifierStart(ch) || ch === 92) {
                    if (ch === 92) {
                        words[1] = words[1].slice(1);
                    }
                    if (!parser.tokenizer.isIdentifier(words[0])) {
                        parser.throwError(null, "The word '" + words[0] + "' must be an identifier");
                    }
                    if (!isOperator(words[1])) {
                        parser.throwError(null, "The word '" + words[1] + "' is not a valid operator");
                    }
//                    console.log("2 post", words[0], words[1]);
                    opname = words[1];
                    params = {type: "Identifier", name: words[0]};
                    associativity = "left";
                    precedence = 15;
                } else {
                    if (!isOperator(words[0])) {
                        parser.throwError(null, "The word '" + words[0] + "' is not a valid operator");
                    }
                    if (!parser.tokenizer.isIdentifier(words[1])) {
                        parser.throwError(null, "The word '" + words[1] + "' must be an identifier");
                    }
//                    console.log("2 prefix", words[0], words[1]);
                    opname = words[0];
                    params = {type: "Identifier", name: words[1]};
                    associativity = "right";
                    precedence = 14;
                }
                break;
            case 3:
                if (!parser.tokenizer.isIdentifier(words[0])) {
                    parser.throwError(null, "The word '" + words[0] + "' must be an identifier");
                }
                if (!isOperator(words[1])) {
                    parser.throwError(null, "The word '" + words[1] + "' is not a valid operator");
                }
                if (!parser.tokenizer.isIdentifier(words[2])) {
                    parser.throwError(null, "The word '" + words[2] + "' must be an identifier");
                }
//                console.log("2 infix", words[0], words[1], words[2]);
                opname = words[1];
                params = [{type: "Identifier", name: words[0]}, {type: "Identifier", name: words[2]}];
                associativity = "binary";
                precedence = 2;
                break;
            case 4:
                parser.throwError(null, "Expected 'precedence' or a block statement insteade of '" + words[3] + "'");
                break;
        }

        if (parsed_precedence) {
            var token = parser.tokenizer.next();
            if (!token || token.type !== "Numeric") {
                parser.throwError(token, "Expected a number following 'precedence'");
            }
            precedence = token.value;
        }

        var code = parser.parseBlockStatement();

        var ret = template { parser.extendSyntax({
            type: 'operator',
            name: @opname,
            associativity: @associativity,
            level: @precedence,
            generator: function(@params) {@code}
        }); }

        if (parser.compiler.options.doc) {
            ret.doc = {
                category: "operator",
                name: opname,
                shortSignature: "operator " + opname,
                longSignature: "operator " + (
                    associativity === "none" ? opname : (
                    associativity === "left" ? "<expr " + words[0] + "> " + opname : (
                    associativity === "right" ? opname + "<expr " + words[1] + ">" : "<expr " + words[0] + "> " + opname + "<expr " + words[2] + ">")))
                    + (parsed_precedence ? " precedence " + precedence : "")
            }
        }

        return ret;
    }
});

/// Defines a new statement.
///
/// statement <name-of-statement> { <parser-function> }
///
/// The name-of-statement is either a JS identifier (e.g. 'select' or 'foo12') or a sequence of characters which are neither white-spaces
/// nor are they characters that may appear in the beginning of a JS identifier (e.g. '///' or '@').
///
/// The parser-function has access to a variable named 'parser' and must scan until the end of the statement
/// including a trailing ';'. The parser-function must return an AST node or an array of AST nodes.
/// These returned AST nodes are put in the resulting AST to represent the parsed statement.
///
/// docHint: {"name": "statement", "category": "statement", "shortSignature": "statement statement", "longSignature": "statement statement"}
export parser.extendSyntax({
    type: 'statement',
    name: 'statement',
    generator: function() {
        parser.tokenizer.skipWhitespace();
        var id = "";
        var j = 0;
        var isIdent = false;
        while(true) {
            ch = parser.tokenizer.peekChar();
            // Break on { or EOF
            if (ch === null || ch === 123) {
                break;
            }
            if (j === 0 && parser.tokenizer.isIdentifierStart(ch)) {
                isIdent = true;
            } else if (j > 0 && isIdent && !parser.tokenizer.isIdentifierPart(ch)) {
                break;
            } else if (j > 0 && !isIdent && parser.tokenizer.isIdentifierStart(ch)) {
                break;
            }
            parser.tokenizer.nextChar();
            if (parser.tokenizer.isWhiteSpace(ch) || parser.tokenizer.isLineTerminator(ch)) {
                break;
            }
            id += String.fromCharCode(ch);
            j++;
        }

//        var id = parser.parseIdentifier();
        var code = parser.parseBlockStatement();

        var ret = template { parser.extendSyntax({
            type: 'statement',
            name: @id,
            generator: function() {@code}
        }); }

        if (parser.compiler.options.doc) {
            ret.doc = {
                category: "statement",
                name: id,
                shortSignature: "statement " + id,
                longSignature: "statement " + id
            }
        }

        return ret;
    }
});

/// The meta-programming package defines two new statements: 'operator' and 'statement' which ease the implementation of new operators or statements.
/// However, this is just a convenience syntax.
///
/// The meta-programming package is only useful in the meta-code (which resides in the 'compiler' sub-directory of each package).
