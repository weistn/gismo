import "gismo/metaprogramming"
import "gismo/template"
import "gismo/grammar"

grammar classGrammar {
	rule start
		= name:Identifier extend:extend? "{" members:docmember* "}"

    rule extend
        = "extends" name:Identifier

    rule docmember
        = member:member { return member; }
        | doc:doc member:member { member.doc = doc; return member; }

    rule doc
        = "///" t:[^\n]* more:doc? { return more ? t + more : t; }

    rule member
        = "constructor" "(" arguments:arguments ")" body:BlockStatement { return {type: "Constructor", arguments: arguments, body: body} }
        | "get" name:Identifier "(" ")" body:BlockStatement { return {type: "Getter", name: name, body: body} }
        | "set" name:Identifier "(" arg:Identifier ")" body:BlockStatement { return {type: "Setter", name: name, body: body, arg: arg} }
        | name:Identifier "(" arguments:arguments ")" body:BlockStatement { return {type: "FunctionDeclaration", name: name, arguments: arguments, body: body} }

	rule arguments
        = name:Identifier more:("," name:Identifier)* {
                var result = [name];
                if (more) {
                    for(var i = 0; i < more.length; i++) {
                        result.push(more[i].name);
                    }
                }
                return result
            }
        |
}

function traverse(ast, callback, parents) {
    if (parents === undefined) {
        parents = [];
    }
    ast = invokeCallback(ast, parents, callback);
    for(var key in ast) {
        var v = ast[key];
        if (typeof v === "object") {
            if (v === null) {
                // Do nothing by intention
            } else if (v.length !== undefined) {
                for(var i = 0; i < v.length; i++) {
                    if (typeof v[i] !== "object") {
                        continue;
                    }
                    parents.push({ast: ast, key: key, index: i});
                    traverse(v[i], callback, parents);
                    parents.pop();
                }
            } else {
                if (typeof v === "object") {
                    parents.push({ast: ast, key: key});
                    traverse(v, callback, parents);
                    parents.pop();
                }
            }
        }
    }
    return ast;
}

function invokeCallback(ast, parents, callback) {
    var result = callback.call(ast, parents);
    if (result === ast) {
        return ast;
    }
    if (parents.length > 0) {
        var p = parents[parents.length - 1];
        if (p.index === undefined) {
            p.ast[p.key] = result;
        } else {
            if (result === null) {
                p.ast[p.key].splice(p.index, 1);
            } else if (typeof result === "object" && result.length !== undefined) {
                Array.prototype.splice.apply(p.ast[p.key], [p.index, 1].concat(result));
            } else {
                p.ast[p.key][p.index] = result;
            }
        }
    }
}

function replaceSuper(parser, className, memberName, ast) {
    function callback(parents) {
        if (this.type === "CallExpression" && this.callee.type === "Identifier" && this.callee.name === "super") {
            if (memberName === null) {
                parser.throwError(this, "Invoking super in a getter or setter is not allowed");
            }
            return template(@className.__super__.@memberName.call(this, @(this.arguments)))
        } else if (this.type === "CallExpression" && this.callee.type === "MemberExpression" && this.callee.object.type === "Identifier" && this.callee.object.name === "super") {
            if (this.callee.property.type !== "Identifier") {
                parser.throwError(this, "Invalid use of super");
            }
            return template(@className.__super__.@(this.callee.property).call(this, @(this.arguments)))
        }
        return this;
    }

    return traverse(ast, callback);
}

function sigArguments(args) {
    var sig = "";
    for(var i = 0; i < args.length; i++) {
        if (sig !== "") {
            sig += ", ";
        }
        sig += args[i].name;
    }
    return sig;
}

export statement class {
	var g = new classGrammar();
	var ast = g.start(parser);

    // Class name
    var name = ast.name;
    var ctor;
    var memberDecl = [];
    var properties = {};
    var docsig = "";
    var docmembers = [];

    if (ast.members) {
        for(var i = 0; i < ast.members.length; i++) {
            if (ast.members[i].type === "Constructor") {
                ctor = ast.members[i];
                if (parser.compiler.options.doc) {
                    docsig += "    constructor(" + sigArguments(ctor.arguments) + ")\n";
                    docmembers.push({
                        name: "constructor",
                        shortSignature: "constructor(" + sigArguments(ctor.arguments) + ")",
                        longSignature: "constructor(" + sigArguments(ctor.arguments) + ")",
                        category: "function",
                        description: ast.members[i].doc
                    });
                }
            } else if (ast.members[i].type === "FunctionDeclaration") {
                memberDecl = memberDecl.concat( template{
                    @name.prototype.@(ast.members[i].name) = function(@(ast.members[i].arguments)) {
                        @(replaceSuper(parser, name, ast.members[i].name, ast.members[i].body))
                    }
                })
                if (parser.compiler.options.doc) {
                    docsig += "    " + ast.members[i].name.name + "(" + sigArguments(ast.members[i].arguments) + ")\n";
                    docmembers.push({
                        name: ast.members[i].name.name,
                        shortSignature: "function " + ast.members[i].name.name + "(" + sigArguments(ast.members[i].arguments) + ")",
                        longSignature: "function " + ast.members[i].name.name + "(" + sigArguments(ast.members[i].arguments) + ")",
                        category: "function",
                        description: ast.members[i].doc
                    });
                }
            } else if (ast.members[i].type === "Getter") {
                if (!properties[ast.members[i].name.name]) {
                    properties[ast.members[i].name.name] = {};
                }
                properties[ast.members[i].name.name].getter = ast.members[i];
                if (parser.compiler.options.doc) {
                    docsig += "    get " + ast.members[i].name.name + "()\n";
                    docmembers.push({
                        name: ast.members[i].name.name,
                        shortSignature: "get " + ast.members[i].name.name + "()",
                        longSignature: "get " + ast.members[i].name.name + "()",
                        category: "get",
                        description: ast.members[i].doc
                    });
                }
            } else if (ast.members[i].type === "Setter") {
                if (!properties[ast.members[i].name.name]) {
                    properties[ast.members[i].name.name] = {};
                }
                properties[ast.members[i].name.name].setter = ast.members[i];
                if (parser.compiler.options.doc) {
                    docsig += "    set " + ast.members[i].name.name + "(value)\n";
                    docmembers.push({
                        name: ast.members[i].name.name,
                        shortSignature: "set " + ast.members[i].name.name + "(value)",
                        longSignature: "set " + ast.members[i].name.name + "(value)",
                        category: "set",
                        description: ast.members[i].doc
                    });
                }
            }
        }
    }

    for(var p in properties) {
        var prop = properties[p];
        if (prop.getter && prop.setter) {
            memberDecl.push(template {
                Object.defineProperty(@name.prototype, @({type: "Literal", value: prop.getter.name.name}), {
                    get: function() {
                        @(replaceSuper(parser, name, prop.getter.name, prop.getter.body))
                    },
                    set: function(@(prop.setter.arg)) {
                        @(replaceSuper(parser, name, prop.setter.name, prop.setter.body))
                    }
                })
            });
        } else if (prop.getter) {
            memberDecl.push(template {
                Object.defineProperty(@name.prototype, @({type: "Literal", value: prop.getter.name.name}), {
                    get: function() {
                        @(replaceSuper(parser, name, prop.getter.name, prop.getter.body))
                    }
                })
            });
        } else if (prop.setter) {
            memberDecl.push(template {
                Object.defineProperty(@name.prototype, @({type: "Literal", value: prop.getter.name.name}), {
                    set: function(@(prop.setter.arg)) {
                        @(replaceSuper(parser, name, prop.setter.name, prop.setter.body))
                    }
                })
            });
        }
    }

    // Arguments to the constructor
    var cargs = [];
    var constructorBody = [];
    if (ctor) {
        constructorBody = replaceSuper(parser, name, identifier "constructor", ctor.body);
        cargs = ctor.arguments;
    }

    var extendCode = [];
    if (ast.extend) {
        extendCode = template {
            @({type: "Identifier", name: parser.importAlias(module)}).extend(@name, @(ast.extend.name));
        }
    }

    var code = template{ var @name = (function() {
        function @name(@cargs) {
            @constructorBody
        }

        @extendCode

        @memberDecl;

        return @name;
    })()};

    if (parser.compiler.options.doc) {
        docmembers.sort(function(a, b) {
            if (a.shortSignature === b.shortSignature) return 0;
            return a.shortSignature < b.shortSignature ? -1 : 1;
        });
        code.doc = {
            category: "class",
            name: name.name,
            shortSignature: "class " + name.name,
            longSignature: "class " + name.name + " {\n" + docsig + "}",
            members: docmembers
        };
    }

    return code;
//	return template{ console.log(@({type: "Literal", value: JSON.stringify(ast, null, '\t')})) };
}
