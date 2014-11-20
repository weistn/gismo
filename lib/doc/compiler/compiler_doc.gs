import "gismo/metaprogramming/keywords";
import "gismo/template/xml"
import "gismo/xml/dom"
import "fs";
import "path";

/// Comments are started with the `///` operator that is defined in this packet.
/// A comment can span multiple lines. Therefore each subsequent line must start with `///`.
/// Whitespace at the beginning or end of a line is ignored.
///
/// Do not forget to include the documentation operator via `import "gismo/doc"` if the `///` operator is supposed to generate documentation.
/// Use the `--doc` command line option when compiling to generate HTML documentation for your package.
/// The following code shows an example usage of the `gismo/doc` package.
/// ``
/// import "gismo/doc";
/// /// This is a comment for the function `foo`.
/// /// This comment can span multiple lines.
/// function foo() { ... }
/// ``
/// A `///` comment preceding a statement comments this statement.
/// Some statements such as control structures (`while`, `for`, `if`) and expression statements are not commentable.
/// Thus, no documentation will be emitted for them.
///
/// A comment at the and of the file will be treated as the package overview.
export statement /// {
    var ch, str = "", token, line;
    // Read all comment lines
    do {
        line = "";
        // Read until end of line
        do {
            var ch = parser.tokenizer.peekChar();
            if (parser.tokenizer.isLineTerminator(ch)) {
                line += String.fromCharCode(10);
                break;
            }
            parser.tokenizer.nextChar();
            line += String.fromCharCode(ch);
        } while(ch);
        str += line;
    } while (parser.tokenizer.presume("///", true));

    // End of file?
    if (parser.tokenizer.lookahead() === null) {
        return {
            type: "EmptyStatement",
            doc: {
                category: "overview",
                description: str
            }
        };
    }

    var doc;
    if (line.trim().substring(0,8) === "docHint:") {
        str = str.substring(0, str.length - line.length);
        line = line.trim();
        doc = JSON.parse(line.substring(8, line.length).trim());
    }

    var st = parser.parseStatement();
    // The above function might return an array, especially when parsing 'export function foo() { }'.
    var s;
    if (st.length !== undefined && st.length > 0) {
        s = st[0];
    } else {
        s = st;
    }

    if (s && doc) {
        s.doc = doc;
    }
    if (s && s.doc) {
        s.doc.description = str;
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

DocSpiller.prototype.addMetaFile = DocSpiller.prototype.addFile;

function assignId(members, idcounter) {
    for(var i = 0; i < members.length; i++) {
        members[i].__id = idcounter++;
        if (members[i].members) {
            idcounter = assignId(members[i], idcounter);
        }
    }
    return idcounter;
}

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
    var pkgOverview = "";
    var idcounter = 1;
    for(var i = 0; i < this.files.length; i++) {
        var f = this.files[i];
        for(var k = 0; k < f.ast.length; k++) {
            var s = f.ast[k];
            if (s.doc && s.doc.category === "overview") {
                pkgOverview = s.doc.description;
            } else if (s.doc && s.exported) {
                s.doc.__id = idcounter++;
                if (s.doc.members) {
                    idcounter = assignId(s.doc.members, idcounter);
                }
                if (!s.doc.group) {
                    indexList.push(s.doc);
                } else {
                    if (!groups[s.doc.group]) {
                        var d = {group: s.doc.group, name: s.doc.group, category: s.doc.category, shortSignature: s.doc.category, __id: idcounter++, items: [s.doc]};
                        groups[s.doc.group] = d;
                        indexList.push(d);
                    } else {
                        groups[s.doc.group].items.push(s.doc);
                    }
                }
            }
        }
    }

    // Sort the index
    indexList.sort(function(a,b) {
        var aname = a.group ? a.group : a.shortSignature;
        var bname = b.group ? b.group : b.shortSignature;
        if (aname === bname) {
            return 0;
        }
        if (aname < bname) {
            return -1;
        }
        return 1;
    });

    var self = this;

    // Template for the index
    var overview = xmlTemplate(docItem, prefix) {
        <dd>< a href={"#item" + docItem.__id}>{prefix + docItem.shortSignature}</a></dd>
        {if docItem.members}
            {foreach docItem.members}
                {overview($data, prefix + String.fromCharCode(160) + String.fromCharCode(160) + String.fromCharCode(160) + String.fromCharCode(160), __doc)}
            {/foreach}
        {/if}
    }

    var groupOverview = xmlTemplate(docItem, prefix) {
        <dd>< a href={"#item" + docItem.__id}>{prefix + docItem.group}</a></dd>
        {if docItem.members}
            {foreach docItem.members}
                {overview($data, prefix + String.fromCharCode(160) + String.fromCharCode(160) + String.fromCharCode(160) + String.fromCharCode(160), __doc)}
            {/foreach}
        {/if}
    }

    var groupDetails = xmlTemplate(docItem) {
        <h2 id={"#item" + docItem.__id}>{docItem.name}</h2>
        {foreach docItem.items}
            <pre>{$data.longSignature}</pre>
            {if $data.description}
                {self.compileMarkdown(__doc, $data.description)}
            {/if}
        {/foreach}
    };

    var details = xmlTemplate(docItem) {
        <h2 id={"item" + docItem.__id}>{docItem.category + " " + docItem.name}</h2>
        <pre>{docItem.longSignature}</pre>
        {if docItem.description}
            {self.compileMarkdown(__doc, docItem.description)}
        {/if}
        {if docItem.members}
            {foreach docItem.members}
                {memberDetails($data, __doc)}
            {/foreach}
        {/if}
    };

    var memberDetails = xmlTemplate(docItem) {
        <h3 id={"item" + docItem.__id}>{docItem.category + " " + docItem.name}</h3>
        <pre>{docItem.longSignature}</pre>
        {if docItem.description}
            {self.compileMarkdown(__doc, docItem.description)}
        {/if}
        {if docItem.members}
            {foreach docItem.members}
                {memberDetails(__doc, $data)}
            {/foreach}
        {/if}
    };

    var tmpl = xmlTemplate() {
        <html>
        <head>
            <meta charset="utf-8"/>
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
            code {{
                padding: 2px 4px;
                color: #800;
                background-color: #f7f7f9;
                border: 1px solid #e1e1e8;
                border-radius: 3px;
            }}
            div#footer {{
                text-align: center;
                color: #666;
                font-size: 14px;
                margin: 40px 0;
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
            <dd><a href="#overview">Overview</a></dd>
            <dd><a href="#index">Index</a></dd>
        </dl>
        <h2 id="overview">Overview</h2>
        <p>{pkgOverview}</p>
        <h2 id="index">Index</h2>
        <dl>
            {foreach indexList}
                {$data.group !== undefined ? groupOverview($data, "", __doc) : overview($data, "", __doc)}
            {/foreach}
        </dd>
        <h4>Package files</h4>
        <dl><dd>
            {foreach self.files}
                <a href={$data.filename}>{path.basename($data.filename)}</a>&#160;
            {/foreach}
        </dd></dl>
        {foreach indexList}
            {$data.items !== undefined ? groupDetails($data, __doc) : details($data, __doc)}
        {/foreach}
        </div>
        <div id="footer">
            Build version gismo {self.compiler.version}.<br/>
            The content of this page is licensed under the Creative Commons Attribution 3.0 License, and code is licensed under a BSD license.
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

DocSpiller.prototype.compileMarkdown = function(doc, markdown) {
    var fragment = doc.createDocumentFragment();
    var node;
    var source = {markdown: markdown, index: 0};
    while((node = this.compileMarkdownParagraph(doc, source)) !== null) {
        fragment.appendChild(node);
    }
    return fragment;
};

DocSpiller.prototype.skipWhitespace = function(str, index) {
    for(var i = index; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        if ((ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
            (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0)) {
            continue;
        }
        return i;
    }
    return str.length;
};

DocSpiller.prototype.compileMarkdownParagraph = function(doc, source) {
    var markdown = source.markdown;
    var index = this.skipWhitespace(markdown, source.index);
    if (markdown.length === index) {
        return null;
    }

    if (markdown.charCodeAt(index) === 96 && markdown.charCodeAt(index + 1) === 96) { // ''
        var n = doc.createElement("pre");
        index += 2;
        // Get text up to the next punctuator or line end
        var start = index;
        while(index < markdown.length) {
            var ch = markdown.charCodeAt(index);
            if (ch === undefined) {
                break;
            }
            index++;
            if (ch === 96 && markdown.charCodeAt(index) === 96) {
                index++;
                break;
            }
        }
        if (start < index - 2) {
            n.appendChild(doc.createTextNode(markdown.substring(start, index - 2).replace(/\s+$/gm,'')));
        }
        source.index = index;
        return n;
    }

    var cssStack = [];
    var nodeStack = [];
    var star = false;
    var underline = false;

    // Create a new p-element
    var node = doc.createElement("p");

    // Count new lines. Two new lines denote the end of the paragraph
    var newLine = 0;
    while(newLine < 2) {
        // Get text up to the next punctuator or line end
        var start = index;
        while(index < markdown.length) {
            var ch = markdown.charCodeAt(index);
            if (ch === 123 || ch === 125 || ch === 126 || ch === 42 || ch === 95 || ch === 96 || ch === 10 || ch === 13) {
                break;
            }
            index++;
        }
        if (start < index) {
            node.appendChild(doc.createTextNode(markdown.substring(start, index)));
            newLine = 0;
        }

        var ch = markdown.charCodeAt(index++);
        // EOF?
        if (!ch) {
            break;
        }
        // Which punctuator did we get?
        switch(ch) {
            case 123: // {
                // TODO
                cssStack.push("{")
                break;
            case 125: // }
                if (cssStack.length === 0 || cssStack.pop() != "{") {
                    parser.throwError(null, "Mismatched closing bracket");
                }
                // TODO
                break;
            case 126: // ~
                // TODO
                break;
            case 96: // `
                if (markdown.charCodeAt(index) === 96) { // ``
                    index--;
                    newLine = 2;
                    break;
                }
                var n = doc.createElement("code");
                // Get text up to the next punctuator or line end
                var start = index;
                while(index < markdown.length) {
                    var ch = markdown.charCodeAt(index);
                    if (ch === undefined) {
                        break;
                    }
                    index++;
                    if (ch === 96) {
                        break;
                    }
                }
                if (start < index - 1) {
                    n.appendChild(doc.createTextNode(markdown.substring(start, index - 1)));
                }
                node.appendChild(n);
                break;
            case 42: // *
                if (star) {
                    if (cssStack.length === 0 || cssStack.pop() != "*") {
                        parser.throwError(null, "Mismatched closing bracket");
                    }
                    node = nodeStack.pop();
                    star = false;
                } else {
                    var n = doc.createElement("span");
                    n.setAttribute("style", "font-weight: bold");
                    node.appendChild(n);
                    nodeStack.push(node);
                    node = n;
                    cssStack.push("*")
                    star = true;
                }
                break;
            case 95: // _
                if (underline) {
                    if (cssStack.length === 0 || cssStack.pop() != "_") {
                        parser.throwError(null, "Mismatched closing bracket");
                    }
                    node = nodeStack.pop();
                    underline = false;
                } else {
                    var n = doc.createElement("span");
                    n.setAttribute("style", "font-style: italic");
                    node.appendChild(n);
                    nodeStack.push(node);
                    node = n;
                    cssStack.push("_");
                    underline = true;
                }
                break;
            case 10:
                newLine++;
                break;
        }
    }
    source.index = index;
    if(nodeStack.length > 0) {
        node = nodeStack[0];
    }
    return node;
}



if (!parser.getCompiler().getSpiller("gismo/doc")) {
    parser.getCompiler().addSpiller("gismo/doc", new DocSpiller(parser.getCompiler()));
}