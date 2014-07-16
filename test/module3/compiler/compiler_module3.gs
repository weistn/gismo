import "gismo/template"
import "gismo/metaprogramming"
import "gismo/grammar";

export operator select { return template ("I am a select")}
export operator a # b precedence 13 { return template (@a.toString() + @b.toString()) }
export operator a# precedence 13 { return template (@a.toString()) }
export operator #a { return template (@a.length) }
export operator not a { return template (!@a) }
export operator a \cube { return template (@a * @a * @a) }
export operator a mod b precedence 13 { return template (@a % @b) }
export operator a equals b precedence 2 { return template (@a == @b) }
export operator params -> expr { return template (function(@params) {return @expr}) }
export operator /// {
	var ch, str = "";
	do {
    	var ch = parser.tokenizer.peekChar();
        if (parser.isLineTerminator(ch)) {
            break;
        }
        parser.tokenizer.nextChar();
        str += String.fromCharCode(ch);
    } while(ch);
	return template(console.log(@str));
}

export statement struct {
	var name = parser.parseIdentifier();
	parser.tokenizer.expect('{');
	parser.tokenizer.expect('}');
	return template{var @name = "foobar"};
}

grammar myGrammar {
	keyword PI;

	rule start
		= a:additive* { return a; }

	rule additive
        = left:multiplicative right:("+" term:additive)? { return right === null ? left : left + right.term; }

	rule multiplicative
  		= left:primary right:("*" term:multiplicative)? { return right === null ? left : left * right.term; }

	rule primary
  		= i:integer { return i; }
		| "PI" { return Math.PI; }
  		| "(" additive:additive ")" { return additive; }

	rule integer
		= digits:Numeric { return digits.value; }
}

export statement calculate {
	var g = new myGrammar();
	var v = g.start(parser);
	parser.parseEndOfStatement();
	return template{ console.log(@v) };
}
