import "gismo/metaprogramming"
import "gismo/template"
import "gismo/grammar"

grammar transformGrammar {
	rule start
		= name:Identifier "(" arguments:arguments ")" pattern:pattern where:("where" body:Expression)? "with" withBody:Expression

    rule pattern
        = "{" body:Statement "}" { return body }
        | '(' expr:Expression ')' { return expr }

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
        | { return [] }
}

function traverseAST(ast, callback, prefix) {
    callback.call(ast, prefix);
    if (ast.type === "Identifier" && ast.name === "@") {
        return null;
    }
    var expr = template( @prefix.type !== @(literal ast.type));
    for(var key in ast) {
        if (key === "loc") {
            continue;
        }
        var v = ast[key];
        if (typeof v === "object") {
            if (v === null) {
                expr = template( @expr || @prefix.@(identifier key) !== null );
            } else if (v.length !== undefined) {
                for(var i = 0; i < v.length; i++) {
                    if (typeof v[i] !== "object") {
                        continue;
                    }
                    var expr2 = traverseAST(v[i], callback, template( @prefix.@(identifier key)[@i] ));
                    if (expr2) {
                        expr = template( @expr || @expr2 );
                    }
                }
            } else {
                if (typeof v === "object") {
                    var expr2 = traverseAST(v, callback, template( @prefix.@(identifier key) ));
                    if (expr2) {
                        expr = template( @expr || @expr2 );
                    }
                }
            }
        } else if (key !== "type") {
            expr = template( @expr || @prefix.@(identifier key) !== @(literal v) );
        }
    }
    return expr;
}

export statement transform {
	var g = new transformGrammar();
	var ast = g.start(parser);
    var vars = [];
    var assignments = [];
    var whereClause = [];
    var ifClause;
    var callbackBody = [];

    if (ast.where) {
        whereClause = template{
            function __where() {
                return @(ast.where.body)
            }
        }
    }

    function generateIf(prefix) {
        if (this.type === "Identifier" && this.name === "@") {
            if (typeof this.content !== "object" || this.content.type !== "Identifier") {
                parser.throwError(this, "Expteced an identifier following @");
            }
            vars.push( template { var @(this.content); } );
            assignments.push( template { @(this.content) = @prefix; } );
        }
    }

    ifClause = traverseAST(ast.pattern, generateIf, template(this));

    if (ast.where) {
        callbackBody.push( template { if (!__where()) return this; } )
    }

    callbackBody.push( template { return @(ast.withBody) } );

    return template{
        function @(ast.name) (__ast, @(ast.arguments)) {
            @vars
            @whereClause
            function __callback(parents) {
                if (@ifClause) {
                    return this;
                }
                @assignments
                @callbackBody
            }
            return @(identifier parser.importAlias(module)).traverse(__ast, __callback);
        }
    }
}
