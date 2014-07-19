import "gismo/metaprogramming"
import "gismo/template"
import "gismo/grammar"

grammar classGrammar {
	rule start
		= name:Identifier extend:extend? "{" members:member* "}"

    rule extend
        = "extends" name:Identifier

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

export statement class {
	var g = new classGrammar();
	var ast = g.start(parser);

    // Class name
    var name = ast.name;
    var ctor;
    var memberDecl = [];
    var properties = {};

    if (ast.members) {
        for(var i = 0; i < ast.members.length; i++) {
            if (ast.members[i].type === "Constructor") {
                ctor = ast.members[i];
            } else if (ast.members[i].type === "FunctionDeclaration") {
                memberDecl = memberDecl.concat( template{
                    @name.prototype.@(ast.members[i].name) = function(@(ast.members[i].arguments)) {
                        @(ast.members[i].body)
                    }
                })
            } else if (ast.members[i].type === "Getter") {
                if (!properties[ast.members[i].name.name]) {
                    properties[ast.members[i].name.name] = {};
                }
                properties[ast.members[i].name.name].getter = ast.members[i];
            } else if (ast.members[i].type === "Setter") {
                if (!properties[ast.members[i].name.name]) {
                    properties[ast.members[i].name.name] = {};
                }
                properties[ast.members[i].name.name].setter = ast.members[i];
            }
        }
    }

    for(var p in properties) {
        var prop = properties[p];
        if (prop.getter && prop.setter) {
            memberDecl.push(template {
                Object.defineProperty(@name.prototype, @({type: "Literal", value: prop.getter.name.name}), {
                    get: function() {
                        @(prop.getter.body)
                    },
                    set: function(@(prop.setter.arg)) {
                        @(prop.setter.body)
                    }
                })
            });
        } else if (prop.getter) {
            memberDecl.push(template {
                Object.defineProperty(@name.prototype, @({type: "Literal", value: prop.getter.name.name}), {
                    get: function() {
                        @(prop.getter.body)
                    }
                })
            });
        } else if (prop.setter) {
            memberDecl.push(template {
                Object.defineProperty(@name.prototype, @({type: "Literal", value: prop.getter.name.name}), {
                    set: function(@(prop.setter.arg)) {
                        @(prop.setter.body)
                    }
                })
            });
        }
    }

    // Arguments to the constructor
    var cargs = [];
    var constructorBody = [];
    if (ctor) {
        constructorBody = ctor.body;
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

    return code;
//	return template{ console.log(@({type: "Literal", value: JSON.stringify(ast, null, '\t')})) };
}
