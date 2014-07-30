import "fs";
import "path";
import "gismo/metaprogramming"

function MarkDownSpiller(compiler) {
    this.compiler = compiler;
    this.files = [];
}

MarkDownSpiller.prototype.addFile = function(filename, ast) {
    this.files.push({filename: filename, ast: ast});
};

MarkDownSpiller.prototype.spill = function() {
    for(var i = 0; i < this.files.length; i++) {
        var f = this.files[i];
        var fname = path.join(path.dirname(this.compiler.main), path.basename(f.filename) + ".html");
        // TODO
        console.log(f.ast);
        fs.writeFileSync(fname, "<html>Hudel Dudel TODO");
    }
};

parser.getCompiler().setSpiller(new MarkDownSpiller(parser.getCompiler()));
//parser.clearSyntax();
parser.getTokenizer().registerPunctuator(":");
parser.getTokenizer().registerPunctuator(";");

function generateHeader() {
    // TODO
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
32,
9,
10,
13
];

function parseCSS(ast) {
    var tokenizer = parser.getTokenizer();
    var ch = tokenizer.peekChar();
    while(ch === 59) { // ;
        tokenizer.nextChar();
        var name = tokenizer.nextChars(stopAtCSSNameEnd);
        ch = tokenizer.peekChar();
        if (ch === 58) { // :
            tokenizer.nextChar();
            var value = tokenizer.nextChars(stopAtCSSValueEnd).trim();
            ch = tokenizer.peekChar();
            ast.style.push({name: name, value: value});
        } else {
            ast.classes.push(name);
        }
    }
}

function parseParagraph() {
    var tokenizer = parser.getTokenizer();
    var ast = { style: [], classes: [], content: [] };

    var ch = tokenizer.peekChar();
    if (ch === 58) { // :
        tokenizer.nextChar();
        var name = tokenizer.nextChars(stopAtCSSNameEnd);
        if (name == "") {
            parser.throwError(name, "Expected a string or identifier to after :");
        }
        ast.label = name;
    }

    parseCSS(ast);

    var cssStack = [];
    var star = false;
    var underline = false;

    var newLine = 0;
    while(newLine < 2) {
        var str = tokenizer.nextChars(stopAt);
        if (str.trim().length != 0) {
            ast.content.push({type: "Text", text: str});
            newLine = 0;
        }
        var ch = tokenizer.nextChar();
        if (!ch) {
            break;
        }
        switch(ch) {
            case 123: // {
                var a = {type: "CSSStart", classes: [], style: []};
                parseCSS(a);
                tokenizer.nextChar();
                ast.content.push(a);
                cssStack.push("{")
                break;
            case 125: // }
                if (cssStack.length === 0 || cssStack.pop() != "{") {
                    parser.throwError(null, "Mismatched closing bracket");
                }
                ast.content.push({type: "CSSEnd"})
                break;
            case 126:
                ast.content.push(parser.parseTerm());
                break;
            case 42:
                if (star) {
                    if (cssStack.length === 0 || cssStack.pop() != "*") {
                        parser.throwError(null, "Mismatched closing bracket");
                    }
                    ast.content.push({type: "CSSEnd"})
                    star = false;
                } else {
                    var a = {type: "CSSStart", classes: [], style: [{name: "font-weight", value: "bold"}]};
                    cssStack.push("*")
                    star = true;
                }
                break;
            case 95:
                if (underline) {
                    if (cssStack.length === 0 || cssStack.pop() != "_") {
                        parser.throwError(null, "Mismatched closing bracket");
                    }
                    ast.content.push({type: "CSSEnd"})
                    star = false;
                } else {
                    var a = {type: "CSSStart", classes: [], style: [{name: "font-style", value: "italic"}]};
                    cssStack.push("_");
                    star = true;
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

export operator ~a {
    var tokenizer = parser.getTokenizer();
    var ch = tokenizer.nextChar();
    if (ch !== ":") {
        parser.throwError(null, "Expected : after ~a");
    }
    var str = tokenizer.nextChars(stopAtUrlEnd);
    console.log("URL", str);
    var ast = {
        type: "Hyperlink",
        classes: [],
        styles: []
    }
    parseCSS(ast);
    tokenizer.nextChar();
    return ast;
}
