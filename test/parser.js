var expect = require('chai').expect;
var parser = require('../parser.js');
var lexer = require('../lexer.js');
var fs = require('fs');
var escodegen = require('escodegen');

describe("My Parser Test", function() {
	it('parse', function() {
//	var str = "var b = 12; /[a-z]/; runat compile { console.log('Hello Compiler') } console.log('a')";
//	var str = "var a = 12; runat compile { console.log('Hello Compiler') } console.log('a')";
//	var str = "const a = 32; debugger";
//	var str = "for(var a in x);"
//	var str = "for(a=0;a<4;a++){print(a)}";
//	var str = "switch(a) { case 0: case 1+2: x; break; default: z}";
//	var str = "if (a) { 1+2 } else if (b) { 3+4 } else { 5 }";
//	var str = "let a =42";
//	var str = "{get x() { return 12 }, set x(y) {this.y = y;}}";
//	var str = "{get x() { return 12 }, set x(y) { this.y = x;}, foo:42, arr: [1,2,3]}";
//	var str = "try { a+b } catch(e) { 1+2 } finally { 3+4}"
//	var str = "do { var a = 2 } while(true); while(false) { break; continue; break foo; continue bar}";
//	var str = "function x(){ console.log(\"Hallo Welt\");\nb = {x:42, a:[1,2,3]} }";

//	var tokens = esprima.tokenize("{foo: 12, \"bar\": 13}", {loc: true});
//	var tokens = esprima.tokenize("return 1+2; return; return a,b,c;", {loc: true});
//	var tokens = esprima.tokenize("while(true) {1+2; return !x;;}; throw a", {loc: true});
//	var tokens = esprima.tokenize("5 * 6\n2+3\n var a = x,\nb = y\nreturn a\nvar b", {loc: true});
//	var tokens = esprima.tokenize("while(a<5){print(a)}", {loc: true});
//	var tokens = esprima.tokenize("for(var a=0;a<4;a++){print(a)}", {loc: true });
//	var tokens = esprima.tokenize("for(a=0;a<4;a++){print();print(a); print(a,b)}", {loc: true });
//	var tokens = esprima.tokenize("a.b.c()", {loc: true });
//	var tokens = esprima.tokenize("a[1,2].x", {loc: true });
//	var tokens = esprima.tokenize("new a; new a.x; new foo(); new foo(1); new foo(1,2); new x.y(); new (u.v); new (a.b)(); new a.b()(12)", {loc: true });
//	var tokens = esprima.tokenize("return a(12)[13].foo(); var a, b = 12, c", { });
//	var tokens = esprima.tokenize("a = function hudel(a,b) { x + y } - 3", {loc: true });
//	var tokens = esprima.tokenize("function hudel(a) { x + y } - 3", {loc: true });
//	var tokens = esprima.tokenize("a = () * 3", { });
//	var tokens = esprima.tokenize("a = b", { });
//	var tokens = esprima.tokenize("a + (x=4) + () + (a,b,c) + [1,2]", { });
//	var tokens = esprima.tokenize("a + 3 + x", { });
//	var tokens = esprima.tokenize("a = b = c", { });
//	var tokens = esprima.tokenize("a + -x * +b++--", { });

		var str = fs.readFileSync("test/parser_test.gs").toString();

		var p = new parser.Parser();
		var program = {type: "Program", body: p.parse(lexer.newTokenizer(str))};

//	console.log(JSON.stringify(parsed, null, '\t'));

		var result = escodegen.generate(program, {sourceMapWithCode: true, sourceMap: "parser_test.gs", sourceContent: str});
//		console.log(JSON.stringify(result.code));

		var code = result.code + "\n//# sourceMappingURL=out.js.map";
		fs.writeFileSync('test/parser_test.js', code);
		fs.writeFileSync('test/parser_test.js.map', result.map.toString());

//	fs.writeFileSync('in.gismo', str);
	});
});
