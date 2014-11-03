import "gismo/doc"
import "gismo/class"

/// A comment
/// on multiple lines
export function foo() {
	
}

/// This variable is 42
export var myvar = 42;

/// Error messages
export var SyntaxError = "Syntax is wrong",
           CompilerError = "Compier does not like your code";

export var nocomment;

/// An exported function
export function callme(a, b) {

}

/// A rectangular area
export class Rect {
	/// Constructs a rectangle from its origin and size
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;
	}
	/// Returns the width in pixels
	get width() {
		return this.width;
	}
	/// Shrinks the rectangle
	shrink(f) {
		this.width *= f;
		this.height *= f;
	}
}

/// This is a test module.
/// It sports an overview comment right at the end of the file