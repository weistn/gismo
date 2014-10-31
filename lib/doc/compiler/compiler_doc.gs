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
                var params = [];
                for(var i = 0; i < s.params.length; i++) {
                    params.push(s.params[i].name);
                }
                s.doc = {
                    description: str,
                    category: "Functions",
                    shortSignature: "function " + s.id.name,
                    longSignature: "function " + s.id.name + "(" + params.join(", ") + ")",
                    name: s.id.name
                }
                break;
            case "VariableDeclaration":
                if (s.doc) {
                    s.doc.description = str;
                }
/*                s.doc = {
                    description: str,
                    category: "Variables",
                    shortSignature: "var " + s.declarations[0].id.name,
                    longSignature: "var " + s.declarations[0].id.name,
                    name: s.declarations[0].id.name
                } */
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
    var indexList = [];
    var groups = {};
    var modulePath = path.basename(this.compiler.path);
    var moduleName = modulePath.lastIndexOf(".") != -1 ? modulePath.slice(0, modulePath.lastIndexOf(".")) : modulePath;
    var idcounter = 1;
    for(var i = 0; i < this.files.length; i++) {
        var f = this.files[i];
        for(var k = 0; k < f.ast.length; k++) {
            var s = f.ast[k];
            if (s.doc && s.exported) {
                s.doc.__id = idcounter++;
                if (s.doc.name !== null) {
                    indexList.push(s.doc);
                } else {
                    if (!groups[s.doc.category]) {
                        var d = {name: s.doc.category, category: s.doc.category, shortSignature: s.doc.category, __id: idcounter++, items: [s.doc]};
                        groups[s.doc.category] = d;
                        indexList.push(d);
                    } else {
                        groups[s.doc.category].items.push(s.doc);
                    }
                }
            }
        }
    }

    // Sort the index
    indexList.sort(function(a,b) {
        if (a.name === b.name) {
            return 0;
        }
        if (a.name < b.name) {
            return -1;
        }
        return 1;
    });

    var self = this;

    // Template for the index
    var overview = xmlTemplate() {
        <dd>< a href={"#item" + $data.__id}>{$data.shortSignature}</a></dd>
    }

    var groupDetails = xmlTemplate() {
        <h2 id={"#item" + $data.__id}>{$data.name}</h2>
        {foreach $data.items}
            <pre>{$data.longSignature}</pre>
            {if $data.description}
                <p>{$data.description}</p>
            {/if}
        {/foreach}
    };

    var details = xmlTemplate() {
        <h2 id={"#item" + $data.__id}>{$data.shortSignature}</h2>
        <pre>{$data.longSignature}</pre>
        {if $data.description}
            <p>{$data.description}</p>
        {/if}
    };

    var tmpl = xmlTemplate() {
        <html>
        <head>
            <style>
            body {{
                font-family: Helvetica, Arial, sans-serif;
                margin: 0;
            }}
            div#container {{
                padding: 0 20px;                
            }}
            div#topbar {{
                background: #E0EBF5;
                height: 64px;
                overflow: hidden;
                padding: 0 20px;                
            }}
            div#heading {{
                margin: 0 0 10px 0;
                padding: 21px 0;
                font-size: 20px;
                font-weight: normal;
            }}
            div#menu {{
                float: right;
                padding: 21px 0;
                text-align: right;
            }}
            div#menu > a {{
                margin-right: 5px;
                margin-bottom: 10px;
                padding: 10px;
                color: white;
                background: #375EAB;
                border: 1px solid #375EAB;
                text-decoration: none;
                font-size: 16px;
                border-radius: 5px;
            }}
            h1, h2, h3, h4 {{
                margin: 20px 0;
                padding: 0;
                font-size: 24px;
                color: #375eab;
                font-weight: bold;
            }}
            h2 {{
                font-size: 20px;
                background: #E0EBF5;
                padding: 2px 5px;
            }}
            h3 {{
                font-size: 20px;
                padding: 2px 5px;
            }}
            h4 {{
                margin: 20px 5px;
                font-size: 16px;
            }}
            a {{
                color: #375eab;
                text-decoration: none;
            }}
            pre, code {{
                font-family: Menlo, monospace;
                font-size: 14px;
            }}
            dl, p, pre {{
                margin: 20px;
            }}
            dd {{
                margin: 2px 20px;
            }}
            pre {{
                background: #e9e9e9;
                padding: 10px;
                -webkit-border-radius: 5px;
                -moz-border-radius: 5px;
                border-radius: 5px;
                line-height: 18px;
            }}
            </style>
        </head>
        <body>
        <div id="topbar">
            <div id="menu">
                <a href="#">Packages</a>
                <a href="#">The Project</a>
            </div>
            <div id="heading">
                Gismo Documentation
            </div>
        </div>
        <div id="container">
        <h1>Package {moduleName}</h1>
        <dl>
            <dd><code>import "{modulePath}"</code></dd>
        </dl>
        <dl>
            <dd><a href="#">Overview</a></dd>
            <dd><a href="#index">Index</a></dd>
        </dl>
        <h2 id="index">Index</h2>
        <dl>
            {foreach indexList}
                {overview(__doc, $data)}
            {/foreach}
        </dd>
        <h4>Package files</h4>
        <dl><dd>
            {foreach self.files}
                <a href={$data.filename}>{path.basename($data.filename)}</a>
            {/foreach}
        </dd></dl>
        {foreach indexList}
            {$data.items !== undefined ? groupDetails(__doc, $data) : details(__doc, $data)}
        {/foreach}
        </div>
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