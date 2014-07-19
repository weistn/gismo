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
        | "get" name:Identifier "(" ")" body:BlockStatement
        | "set" name:Identifier "(" arg:Identifier ")" body:BlockStatement
        | name:Identifier "(" arguments:arguments ")" body:BlockStatement

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
    if (ast.members) {
        for(var i = 0; i < ast.members.length; i++) {
            if (ast.members[i].type === "Constructor") {
                ctor = ast.members[i];
            }
        }
    }
    // Arguments to the constructor
    var cargs = [];
    var constructorBody = [];
    if (ctor) {
        constructorBody = ctor.body;
        cargs = ctor.arguments;
    }
    var code = template{ var @name = (function() {
        function @name(@cargs) {
            @constructorBody
        }

        return @name;
    })()};

    return code;
//	return template{ console.log(@({type: "Literal", value: JSON.stringify(ast, null, '\t')})) };
}
