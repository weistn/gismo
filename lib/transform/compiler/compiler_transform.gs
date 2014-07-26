import "gismo/metaprogramming"
import "gismo/template"
import "gismo/grammar"

grammar transformGrammar {
	rule start
		= name:Identifier "(" arguments:arguments ")" pattern:pattern where:("where" body:Expression)? "with" withBody:Expression

    rule pattern
        before {
            parser.storeContext();
            registerAtPunctuator(parser);
        }
        = "{" body:Statement "}" { return body }
        | '(' expr:Expression ')' { return expr }
        after {
            parser.restoreContext();
        }

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

function registerAtPunctuator(parser) {
    parser.tokenizer.registerPunctuator("...");
    parser.removeSyntax({
    	type: 'operator',
    	associativity: "none",
    	name: "@"
    });
    parser.extendSyntax({
    	type: 'operator',
    	associativity: "none",
    	name: "@",
    	level: 18,
    	generator: function() {
            var name = parser.parseIdentifier();
            var dotted = false;
            if (parser.tokenizer.presume("...", true)) {
                dotted = true;
            }
    		return {
    			type: "Identifier",
    			name: "@",
    			content: name,
                dotted: dotted,
    			loc: name.loc
    		};
    	}
    });
}

function traverseAST(ast, prefix, vars, assignments) {
    if (ast.type === "Identifier" && ast.name === "@") {
        if (typeof ast.content !== "object" || ast.content.type !== "Identifier") {
            parser.throwError(this, "Expteced an identifier following @");
        }
        vars.push( template { var @(ast.content); } );
        assignments.push( template { @(ast.content) = @prefix; } );
        return null;
    }

    if (ast.type === "BlockStatement" && ast.body.length === 1 && ast.body[0].type === "ExpressionStatement" && ast.body[0].expression.type === "Identifier" && ast.body[0].expression.name === "@" && ast.body[0].expression.dotted) {
        vars.push( template { var @(ast.body[0].expression.content); } );
        assignments.push( template { @(ast.body[0].expression.content) = @prefix.body; } );
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
				    if ((ast.type === "FunctionExpression" || ast.type === "FunctionDeclaration") && key === "params" && v[i].type === "Identifier" && v[i].name === "@" && v[i].dotted) {
			            vars.push( template { var @(ast.params[0].content); } );
						if (1 === v.length) {
		    				assignments.push( template { @(ast.params[0].content) = @prefix.params; } );
						}
						// Last parameter is dotted?
						else if (i + 1 === v.length) {
            				assignments.push( template { @(ast.params[0].content) = @prefix.params.slice(@i); } );
						}
						// Other parameters follow the dotted one
						else {
            				assignments.push( template { @(ast.params[0].content) = @prefix.params.slice(@i, @prefix.params.length - @(v.length - i - 1)); } );
						}
				        continue;
				    }
                    var expr2 = traverseAST(v[i], template( @prefix.@(identifier key)[@i] ), vars, assignments);
                    if (expr2) {
                        expr = template( @expr || @expr2 );
                    }
                }
            } else {
                if (typeof v === "object") {
                    var expr2 = traverseAST(v, template( @prefix.@(identifier key) ), vars, assignments);
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
        } else if (this.type === "BlockStatement" && this.body.length === 1 && this.body[0].type === "ExpressionStatement" && this.body[0].expression.type === "Identifier" && this.body[0].expression.name === "@" && this.body[0].expression.dotted) {
            vars.push( template { var @(this.body[0].expression.content); } );
            assignments.push( template { @(this.body[0].expression.content) = @prefix.body; } );
        } else if ((this.type === "FunctionExpression" || this.type === "FunctionDeclaration") && this.params.length === 1 && this.params[0].type === "Identifier" && this.params[0].name === "@" && this.params[0].dotted) {
            vars.push( template { var @(this.params[0].content); } );
            assignments.push( template { @(this.params[0].content) = @prefix.params; } );
		}
    }

    ifClause = traverseAST(ast.pattern, template(this), vars, assignments);

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
