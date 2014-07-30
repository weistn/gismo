import "gismo/template";

function isOperator(str) {
    if (parser.isIdentifierStart(str.charCodeAt(0))) {
        return parser.isIdentifier(str);
    }
    return true;
}

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
                if (j === 0 && parser.isIdentifierStart(ch)) {
                    isIdent = true;
                } else if (j > 0 && isIdent && !parser.isIdentifierPart(ch)) {
                    break;
                } else if (j > 0 && !isIdent && parser.isIdentifierStart(ch)) {
                    break;
                }
                parser.tokenizer.nextChar();
                if (parser.isWhiteSpace(ch) || parser.isLineTerminator(ch)) {
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
                if (!parser.isIdentifierStart(ch) || ch === 92) {
                    if (ch === 92) {
                        words[1] = words[1].slice(1);
                    }
                    if (!parser.isIdentifier(words[0])) {
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
                    if (!parser.isIdentifier(words[1])) {
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
                if (!parser.isIdentifier(words[0])) {
                    parser.throwError(null, "The word '" + words[0] + "' must be an identifier");
                }
                if (!isOperator(words[1])) {
                    parser.throwError(null, "The word '" + words[1] + "' is not a valid operator");
                }
                if (!parser.isIdentifier(words[2])) {
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

        return template { parser.extendSyntax({
            type: 'operator',
            name: @opname,
            associativity: @associativity,
            level: @precedence,
            generator: function(@params) {@code}
        }); }
    }
});

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
            if (j === 0 && parser.isIdentifierStart(ch)) {
                isIdent = true;
            } else if (j > 0 && isIdent && !parser.isIdentifierPart(ch)) {
                break;
            } else if (j > 0 && !isIdent && parser.isIdentifierStart(ch)) {
                break;
            }
            parser.tokenizer.nextChar();
            if (parser.isWhiteSpace(ch) || parser.isLineTerminator(ch)) {
                break;
            }
            id += String.fromCharCode(ch);
            j++;
        }

//        var id = parser.parseIdentifier();
        var code = parser.parseBlockStatement();

        return template { parser.extendSyntax({
            type: 'statement',
            name: @id,
            generator: function() {@code}
        }); }
    }
});
