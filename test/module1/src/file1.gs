runat compile {
	console.log("It's compile time for module1")
	parser.newOperand('linepos', function() {
		return {
			type: "Literal",
			value: "NEW OPERAND"
		};
	});
}

console.log("Hello Gismo, from module1");
console.log(linepos);
