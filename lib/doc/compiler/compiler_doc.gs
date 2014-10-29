import "gismo/metaprogramming";
import "gismo/template/xml"
import "gismo/xml/dom"
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

    var st = parser.parseStatement();
    // The above function might return an array, especially when parsing 'export function foo() { }'.
    var s;
    if (st.length !== undefined && st.length > 0) {
        s = st[0];
    } else {
        s = st;
    }

    if (s) {
        switch(s.type) {
            case "FunctionDeclaration":
                s.doc = {
                    description: str,
                    category: "Functions",
                    name: s.id.name
                }
                break;
            case "VariableDeclaration":
                s.doc = {
                    description: str,
                    category: "Variables",
                    name: s.declarations[0].id.name
                }
                break;
        }
    }
    return st;
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

    // Iterate over all top-level AST-nodes in all files and extract AST-nodes that feature documentation.
    // The key is the documentation-category (e.g. function, var, ...) of the AST-nodes 
    var docObjects = {};
    var modulePath = path.basename(this.compiler.path);
    for(var i = 0; i < this.files.length; i++) {
        var f = this.files[i];
        for(var k = 0; k < f.ast.length; k++) {
            var s = f.ast[k];
            if (s.doc) {
                if (!docObjects[s.doc.category]) {
                    docObjects[s.doc.category] = [];
                }
                docObjects[s.doc.category].push(s);
            }
        }
    }

    var overview = xmlTemplate(){
        <dl>
            {foreach $data}
                <dd>{$data.doc.name}</dd>
            {/foreach}
        </dl>
    }

    var details = xmlTemplate() {
        {foreach $data.nodes}
            <h2>{$data.doc.name}</h2>
            <div>{$data.doc.description}</div>
        {/foreach}
    };

    var tmpl = xmlTemplate() {
        <html>
        <body>
        <h1>Package {modulePath}</h1>
        <dl>
            <dd><code>import "{modulePath}</code></dd>
        </dl>
        <dl>
            <dd><a href="#">Overview</a></dd>
            <dd><a href="#">Index</a></dd>
        </dl>
        <h2>Index</h2>
        {if docObjects["Functions"]}
            <h4>Functions</h4>
            {overview(__doc, docObjects["Functions"])}
        {/if}
        {if docObjects["Variables"]}
            <h4>Variables</h4>
            {overview(__doc, docObjects["Variables"])}
        {/if}
        {foreach Object.keys(docObjects)}
            {if $data !== "Functions" && $data !== "Variables"}
                <h4>{$data}</h4>
                {overview(__doc, docObjects[$data])}
            {/if}
        {/foreach}

        {if docObjects["Functions"]}
            {details(__doc, {category: "Functions", nodes: docObjects["Functions"]})}
        {/if}
        {if docObjects["Variables"]}
            {details(__doc, {category: "Variables", nodes: docObjects["Variables"]})}
        {/if}
        {foreach Object.keys(docObjects)}
            {if $data !== "Functions" && $data !== "Variables"}
                {details(__doc, {category: $data, nodes: docObjects[$data]})}
            {/if}
        {/foreach}
        </body>
        </html>
    };

    var ser = new dom.HTMLSerializer();
    var html = ser.serializeToString(tmpl());

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