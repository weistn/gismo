import "gismo/metaprogramming"
import "gismo/template"
import "gismo/grammar"

grammar classGrammar {
	rule start
		= name:Identifier extend:extend? "{" members:member* "}"

    rule extend
        = "extends" name:Identifier

    rule member
        = "constructor" "(" arguments:arguments ")" body:BlockStatement
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
	return template{ console.log(@({type: "Literal", value: JSON.stringify(ast, null, '\t')})) };
}
