import "gismo/metaprogramming";
import "fs";
import "path";

export statement /// {
    var ch, str = "", token;
    // Read all comment lines
    do {
        // Read until end of line
        do {
            var ch = parser.tokenizer.peekChar();
            if (parser.tokenizer.isLineTerminator(ch)) {
                break;
            }
            parser.tokenizer.nextChar();
            str += String.fromCharCode(ch);
        } while(ch);
    } while (parser.tokenizer.presume("///", true));

    // End of file?
    if (parser.tokenizer.lookahead() === null) {
        return null;
    }

    var s = parser.parseStatementOrBlockStatement();
    s.doc = str;
    return s;
}


function DocSpiller(compiler) {
    this.compiler = compiler;
    this.imports = [];
    this.files = [];
}

DocSpiller.prototype.addFile = function(filename, ast, src, action) {
    if (!ast) {
        return;
    }

    this.files.push({
        filename: filename,
        ast: ast
    })
};

DocSpiller.prototype.spill = function() {
    if (!this.compiler.options.doc) {
        return;
    }

    var html = "<html><head></head><body>";

    for(var i = 0; i < this.files.length; i++) {
        var f = this.files[i];
        for(var k = 0; k < f.ast.length; k++) {
            var s = f.ast[k];
            if (s.doc) {
                html += s.doc;
            }
        }
    }

    html += "</body>";

    fs.writeFileSync(path.join(path.dirname(this.compiler.mainFile()), "doc.html"), html);
};

DocSpiller.prototype.addDependency = function(modulePath, pkg, alias, name, isMeta) {
    this.imports.push({
        name: name,
        module: modulePath,
        alias: alias,
        meta: isMeta,
        uniqueId: pkg.gismo ? pkg.gismo.uniqueId : null
    });
};

parser.getCompiler().addSpiller("doc", new DocSpiller(parser.getCompiler()));