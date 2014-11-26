import "gismo/class"
import "gismo/doc"

/// Represents a game character.
export class Character {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    attack(character) {
        console.log("   attacking " + character)
    }
}

/// Represents a monster with a health indicator.
export class Monster extends Character {
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
