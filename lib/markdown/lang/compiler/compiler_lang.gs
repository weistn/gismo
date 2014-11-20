import "fs";
import "path";
import "gismo/metaprogramming/keywords"

function MarkDownSpiller() {
}

MarkDownSpiller.prototype.spill = function(filename, f) {
    var fname = path.join(path.dirname(parser.getCompiler().main), path.basename(filename) + ".html");

    var html = "";
    for(var j = 0; j < f.length; j++) {
        var ast = f[j];
        if (ast.generator) {
            html += ast.generator.call(ast, f);
        }
    }
    console.log(f.ast);
    fs.writeFileSync(fname, html);
};

parser.setSpiller(new MarkDownSpiller());

//parser.clearSyntax();
//parser.getTokenizer().registerPunctuator(":");
//parser.getTokenizer().registerPunctuator(";");

function generateCSS(ast) {
    var css = "";
    if (ast.classes.length > 0) {
        css += " class=\"" + ast.classes.join(" ") + "\"";
    }
    if (ast.style.length > 0) {
        css += " style=\"";
        for(var i = 0; i < ast.style.length; i++) {
            if (i > 0) {
                css += ";";
            }
            css += ast.style[i].name + ":" + ast.style[i].value;
        }
        css += '"';
    }
    return css;
}

function generateTagContent(tagAST, fileAST) {
    var html = "";
    for(var i = 0; i < tagAST.content.length; i++) {
        var ast = tagAST.content[i];
        if (ast.generator) {
            html += ast.generator.call(ast, fileAST);
        } else if (ast.type === "Text") {
            html += htmlEscape(ast.text);
        } else if (ast.type === "CSSStart") {
            html += "<span" + generateCSS(ast) + ">";
        } else if (ast.type === "CSSEnd") {
            html += "</span>";
        }
    }
    return html;
}

function generateParagraph(fileAST) {
    var html = "<p" + generateCSS(this) + ">";
    html += generateTagContent(this);
    html += "</p>";
    return html;
};

function generateHeader(fileAST) {
    var html = "<h" + this.level.toString() + generateCSS(this) + ">";
    html += generateTagContent(this);
    html += "</h" + this.level.toString() + ">";
    return html;
};

function generateHyperLink(fileAST) {
    var html = "<a href=\"" + this.url + "\"" + generateCSS(this) + ">" + htmlEscape(this.url) + "</a>";
    console.log(html);
    return html;
};

function htmlEscape(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

var stopAt = [
123, // {
125, // }
126, // ~
42, // *
95, // _
10
];

var stopAtCSSValueEnd = [
32,
9,
59, // ;
10,
13
];

var stopAtCSSNameEnd = [
32,
9,
58, // :
59, // ;
10,
13
];

var stopAtUrlEnd = [
59, // ;
32,
9,
10,
13
];

parser.statementPreprocessor = function(token) {
    if (token.type === "Punctuator" && token.value[0] === "#") {
        return null;
    }
    if (token.type === "Keyword" && token.value === "import") {
        return null;
    }
    return parseParagraph;
};

function parseCSS(ast, skipDelimiter) {
    var tokenizer = parser.getTokenizer();
    var ch = tokenizer.peekChar();
    if (skipDelimiter) {
        ch = 59;
    }
    while(ch === 59) { // ;
        if (skipDelimiter) {
            skipDelimiter = false;
        } else {
            tokenizer.nextChar();
        }
        var name = tokenizer.nextChars(null, stopAtCSSNameEnd);
        ch = tokenizer.peekChar();
        if (ch === 58) { // :
            tokenizer.nextChar();
            var value = tokenizer.nextChars(null, stopAtCSSValueEnd).trim();
            ch = tokenizer.peekChar();
            ast.style.push({name: name, value: value});
        } else {
            ast.classes.push(name);
        }
    }
}

function parseParagraph() {
    var tokenizer = parser.getTokenizer();
    var ast = { style: [], classes: [], content: [], type: "Paragraph", generator: generateParagraph };

    // The paragraph might have a label as in "#:mylabel"
    var ch = tokenizer.peekChar();
    if (ch === 58) { // :
        tokenizer.nextChar();
        var name = tokenizer.nextChars(null, stopAtCSSNameEnd);
        if (name == "") {
            parser.throwError(name, "Expected a string or identifier to after :");
        }
        ast.label = name;
    }

    // The paragraph might have CSS as in "#;color:red"
    parseCSS(ast);
    tokenizer.skipWhitespace();

    var cssStack = [];
    var star = false;
    var underline = false;

    // Count new lines. Two new lines denote the end of the paragraph
    var newLine = 0;
    while(newLine < 2) {
        // Get text up to the next punctuator or line end
        var str = tokenizer.nextChars(null, stopAt);
        if (str.length != 0) {
            ast.content.push({type: "Text", text: str});
            newLine = 0;
        }
        var ch = tokenizer.nextChar();
        // EOF?
        if (!ch) {
            break;
        }
        // Which punctuator did we get?
        switch(ch) {
            case 123: // {
                var a = {type: "CSSStart", classes: [], style: []};
                parseCSS(a, true);
                tokenizer.skipWhitespace();
//                tokenizer.nextChar();
                ast.content.push(a);
                cssStack.push("{")
                break;
            case 125: // }
                if (cssStack.length === 0 || cssStack.pop() != "{") {
                    parser.throwError(null, "Mismatched closing bracket");
                }
                ast.content.push({type: "CSSEnd"})
                break;
            case 126: // ~
                ast.content.push(parser.parseTerm());
                break;
            case 42: // *
                if (star) {
                    if (cssStack.length === 0 || cssStack.pop() != "*") {
                        parser.throwError(null, "Mismatched closing bracket");
                    }
                    ast.content.push({type: "CSSEnd"})
                    star = false;
                } else {
                    ast.content.push({type: "CSSStart", classes: [], style: [{name: "font-weight", value: "bold"}]});
                    cssStack.push("*")
                    star = true;
                }
                break;
            case 95: // _
                if (underline) {
                    if (cssStack.length === 0 || cssStack.pop() != "_") {
                        parser.throwError(null, "Mismatched closing bracket");
                    }
                    ast.content.push({type: "CSSEnd"})
                    underline = false;
                } else {
                    ast.content.push({type: "CSSStart", classes: [], style: [{name: "font-style", value: "italic"}]});
                    cssStack.push("_");
                    underline = true;
                }
                break;
            case 10:
                newLine++;
                break;
        }
    }
    while(cssStack.length > 0) {
        cssStack.pop();
        ast.content.push({type: "CSSEnd"});
    }
    return ast;
}

export statement # {
    var ast = parseParagraph();
    ast.type = "HeaderNode";
    ast.level = 1;
    ast.generator = generateHeader;
    return ast;
}

export statement ## {
    var ast = parseParagraph();
    ast.type = "HeaderNode";
    ast.level = 2;
    ast.generator = generateHeader;
    return ast;
}

export operator a {
    var tokenizer = parser.getTokenizer();
    var ch = tokenizer.nextChar();
    if (ch !== 58) { // :
        parser.throwError(null, "Expected : after ~a");
    }
    var str = tokenizer.nextChars(null, stopAtUrlEnd);
    console.log("URL", str);
    var ast = {
        type: "Hyperlink",
        url: str,
        classes: [],
        style: [],
        generator: generateHyperLink
    }
    parseCSS(ast);
    return ast;
}
