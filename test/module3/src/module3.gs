import "gismo/class"

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

calculate (3+5)*2 8 16 2*PI;

console.log("fini");

class Character {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	attack(character) {
		console.log("   attacking " + character)
	}
}

class Monster extends Character {
	constructor(x, y, name) {
		super(x, y);
		this.name = name;
		this.health_ = 100;
	}

  	attack(character) {
		console.log(this.name + " is");
    	super.attack(character);
    	// Can also be written as:
    	super(character);
  	}

  	get isAlive() { return this.health_ > 0; }
  	get health() { return this.health_; }
  	set health(value) {
	    if (value < 0) throw new Error('Health must be non-negative.');
	    this.health_ = value;
  	}
}

var monster = new Monster(42, 142, "Imp");
console.log(monster.isAlive, monster.health);
monster.health = 0;
console.log(monster.isAlive, monster.health);
monster.attack("Dwarf");
