import "gismo/grammar";

var arr = [5,6,7,8];
console.log(#arr);
console.log(9 # arr)
//console.log(arr.slice(1)#);
console.log(not true);
console.log(5 cube);
console.log(1 + 2 mod 3 + 4);
console.log(1 * 2 mod 3 * 4);
console.log(1 + 2 equals 3 + 4);
console.log(1 * 2 equals 3 * 4);
console.log((x -> x+1)(41))
/// This comment prints itself

{
	// A block statement
	var inblock = 3;
}

struct s { }

grammar myGrammar {
	rule start
		= additive+

	rule additive
        = left:multiplicative ("+" right:additive)? { return right === null ? left : left + right; }

	rule multiplicative
  		= left:primary ("*" right:multiplicative)? { return right === null ? left : left * right; }

	rule primary
  		= integer
  		| "(" additive:additive ")" { return additive; }

	rule integer
		= digits:Numeric { return digits.value; }
}
