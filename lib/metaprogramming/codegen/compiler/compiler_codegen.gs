/// The `@` operator is used inside a `template` clause to refer to a placeholder.
///
/// docHint: {"name": "@", "category": "operator", "shortSignature": "operator @", "longSignature": "operator @"}
export parser.extendSyntax({
    type: 'operator',
    associativity: "none",
    name: "@",
    level: 18,
    generator: function() {
        var content = parser.parseTerm();
        return {
            type: "Identifier",
            name: "@",
            content: content,
            loc: content.loc
        };
    }
});

// 'obj' is an array of AST nodes
function arrayExpressionFromObject(obj) {
    var elements = [];
    for(var i = 0; i < obj.length; i++) {
        var value = objectExpressionFromObject(obj[i]);
        elements.push(value);
    }
    return {
        type: "ArrayExpression",
        elements: elements
    }
}

// 'obj' is an AST node. It returns another AST that, when executed, returns an AST equivalent to 'obj'.
// The only difference between 'obj' and the result of executing the returned AST is that the returned
// AST substituted all occurrences of '@'.
function objectExpressionFromObject(obj) {
    // Turn "@(expr)" into "expr"
    if (typeof obj === "object" && obj.type === "Identifier" && obj.name === "@") {
        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toAST"
                }
            },
            "arguments": [
                obj.content
            ]
        };
    }
    // Turn "{ ...; @(expr); ... }" into { ... ; expr; ... }
    if (typeof obj === "object" && obj.type === "ExpressionStatement" && typeof obj.expression === "object" && obj.expression.type === "Identifier" && obj.expression.name === "@") {
        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toStatement"
                }
            },
            "arguments": [
                obj.expression.content
            ]
        };
    }

    var props = [];
    for(var key in obj) {
        if (key === "loc" || key === "doc") {
            continue;
        }
        var value = obj[key];
        switch (typeof value) {
            case "object":
                if (value !== null) {
                    if (obj.type === "BlockStatement" && key === "body") {
                        var special = false;
                        for(var i = 0; i < value.length; i++) {
                            var v = value[i];
                            if (typeof v === "object" && v.type === "ExpressionStatement" && typeof v.expression === "object" && v.expression.type === "Identifier" && v.expression.name === "@") {
                                special = true;
                            }
                        }
                        if (special) {
                            var tmp = {
                                "type": "CallExpression",
                                "callee": {
                                    "type": "MemberExpression",
                                    "computed": false,
                                    "object": {
                                        "type": "Identifier",
                                        "name": parser.importAlias(module)
                                    },
                                    "property": {
                                        "type": "Identifier",
                                        "name": "toBlockStatementBody"
                                    }
                                },
                                "arguments": [ ]
                            };
                            for(var i = 0; i < value.length; i++) {
                                var v = value[i];
                                tmp.arguments.push(objectExpressionFromObject(v));
                            }
                            value = tmp;
                        } else {
                            value = arrayExpressionFromObject(value);
                        }
                        break;
                    } else if ((obj.type === "FunctionDeclaration" || obj.type === "FunctionExpression") && key === "params") {
                        // Handle "function(@params)"
                        var params = [];
                        var special = false;
                        for(var i = 0; i < value.length; i++) {
                            var v = value[i];
                            if (typeof v === "object" && v.type === "Identifier" && v.name === "@") {
                                special = true;
                                params.push(v.content);
                            } else {
                                params.push(objectExpressionFromObject(v));
                            }
                        }
                        if (special) {
                            value = {
                                "type": "CallExpression",
                                "callee": {
                                    "type": "MemberExpression",
                                    "computed": false,
                                    "object": {
                                        "type": "Identifier",
                                        "name": parser.importAlias(module)
                                    },
                                    "property": {
                                        "type": "Identifier",
                                        "name": "toFunctionParameters"
                                    }
                                },
                                "arguments": params
                            };
                            break;
                        }
                    // Handle "f(@args)"
                    } else if (obj.type === "CallExpression" && key === "arguments") {
                        var args = [];
                        var special = false;
                        for(var i = 0; i < value.length; i++) {
                            var v = value[i];
                            if (typeof v === "object" && v.type === "Identifier" && v.name === "@") {
                                special = true;
                                args = args.concat(v.content);
                            } else {
                                args = args.concat(objectExpressionFromObject(v));
                            }
                        }
//                      console.log(JSON.stringify(arguments));
                        if (special) {
                            value = {
                                "type": "CallExpression",
                                "callee": {
                                    "type": "MemberExpression",
                                    "computed": false,
                                    "object": {
                                        "type": "Identifier",
                                        "name": parser.importAlias(module)
                                    },
                                    "property": {
                                        "type": "Identifier",
                                        "name": "toFunctionArguments"
                                    }
                                },
                                "arguments": args
                            };
                            break;
                        }
                    }
                    if (value.length === undefined) {
                        value = objectExpressionFromObject(value);
                    } else {
                        value = arrayExpressionFromObject(value);
                    }
                    break;
                }
            case "number":
            case "string":
            case "boolean":
                value = {
                    type: "Literal",
                    value: value
                };
                break;
            default:
                throw "Implementation Error: key=" + key + ", typeof value=" + typeof value + " obj=" + JSON.stringify(obj);
        }
        props.push({
            "type": "Property",
            "key": {
                "type": "Literal",
                "value": key
            },
            "value": value,
            "kind": "init"
        });
    }
    return {
        "type": "ObjectExpression",
        "properties": props
    }
};

/// The `template` operator simplifies the generation of code.
///
/// When implementing new operators or statements, these implementations must return a JavaScript AST (Abstract Syntax Tree).
/// This can either be done via complex JSON expressions, or short and simple with `template`.
/// ``
/// var ast = template (a+b)
/// ``
/// The above example returns an AST that adds variables named `a` and `b`.
/// If the name of these variables is only known when `template` executes, we can use placeholders.
/// ``
/// var a = "foo";
/// var b = "bar";
/// var ast = template (@a+@b);
/// ``
/// The above example returns an AST that adds variables named `foo` and `bar`.
/// A placeholder is either an identifier or an expression wrapped in paranthesis as in the following example.
/// ``
/// var a = "foo";
/// var b = "bar";
/// var ast = template (@(a.toUpperCase())+@(b.toUpperCase()));
/// ``
///
/// The examples so far generated an AST for an expression. To generate an AST for a statement use the following syntax (notice the curly braces).
/// ``
/// var ast = template {a+b}
/// ``
/// This generates an AST for an expression-statement that in turn contains an expression that adds `a` and `b`.
/// If there are multiple statements inside the curly braces, the `template` operator returns an array with these statement-ASTs as in the following example:
/// ``
/// var ast = template {
///     var square = foo();
///     console.log(square * square);   
/// }
/// ``
///
/// The expressions or statements inside the `template` clause can in turn use all syntax extensions that are currently loaded.
/// Hence, we can easily generate classes (which are themselves a syntax extension).
/// ``
/// import "gismo/class";
///
/// var name = "Foo";
/// var ast = template{ class @name {} };
/// ``
///
/// docHint: {"name": "template", "category": "operator", "shortSignature": "operator template", "longSignature": "operator template"}
export parser.extendSyntax({
    type: 'operator',
    associativity: 'none',
    level: 18,
    name: "template",
    generator: function() {
        if (parser.tokenizer.presume('(', false)) {
            return objectExpressionFromObject(parser.parseTerm());
        }
        var s = parser.parseBlockStatement();
        if (s.body.length === 1 ) {
            return objectExpressionFromObject(s.body[0]);
        }
        return arrayExpressionFromObject(s.body);
    }
});

/// The `identifier` operator returns an AST-node that represents an identifier.
/// The name of this identifier is determined by the expression following the `identifier` keyword.
/// ``
/// var path = ["foo", "bar"];
/// var ast = identifier path.join("_")
/// ``
/// The above example generates an AST-node for an identifier named `foo_bar`.
///
/// Of course the same logic could have been implemented with a normal function as follows:
/// ``
/// function identifier(expr) {
///     return {type: "Identifier", name: expr.toString()};    
/// }
/// var path = ["foo", "bar"];
/// var ast = identifier(path.join("_"));
/// ``
/// However, this solution requires a function call. Using the `identifier` keyword works like a macro expansion and generates the following code:
/// ``
/// var ast = {type: "Identifier", name: path.join("_")};
/// ``
/// When used heavily inside of code generation, this can lead to performance benefits since there is no function call involved here.
///
/// docHint: {"name": "identifier", "category": "operator", "shortSignature": "operator identifier", "longSignature": "operator identifier"}
export parser.extendSyntax({
    type: 'operator',
    associativity: 'none',
    level: 18,
    name: "identifier",
    generator: function() {
        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toIdentifier"
                }
            },
            "arguments": [parser.parseExpression(parser.Mode_ExpressionWithoutComma)]
        };
    }
});

/// The same as the `identifier` operator, but `literal` returns an AST-literal that has the value of the expression that is being passed.
/// ``
/// var ast = literal 2 * 21;
/// ``
/// The above example generates an AST literal node with value 42 and his hence equivalent to
/// ``
/// var ast = {type: "Literal", value: 2*21};
/// ``
///
/// docHint: {"name": "literal", "category": "operator", "shortSignature": "operator literal", "longSignature": "operator literal"}
export parser.extendSyntax({
    type: 'operator',
    associativity: 'none',
    level: 18,
    name: "literal",
    generator: function() {
        return {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": parser.importAlias(module)
                },
                "property": {
                    "type": "Identifier",
                    "name": "toLiteral"
                }
            },
            "arguments": [parser.parseExpression(parser.Mode_ExpressionWithoutComma)]
        };
    }
});

/// The `codegen` module offers the `template` syntax that greatly simplifies the generator of AST (abstract syntax tree) nodes.
/// In addition to `template`, the module defines some utility functions and syntax extensions.