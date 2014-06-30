import "module1"
import "module2"

export operator select { return template ("I am a select")}
//export operator a # b {}
//export operator a# { }
export operator #a { return template (@a.length) }
export operator not a { return template (!@a) }
export operator a \cube { return template (@a * @a * @a) }
export operator a mod b precedence 13 { return template (@a % @b) }
export operator a equals b precedence 2 { return template (@a == @b) }
export operator params -> expr { return template (function(@params) {return @expr}) }

export statement struct {
	var name = parser.parseIdentifier();
	parser.tokenizer.expect('{');
	parser.tokenizer.expect('}');
	return template{var @name = "foobar"};
}