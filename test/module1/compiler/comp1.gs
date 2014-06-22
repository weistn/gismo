console.log("Compiler code of module1")

parser.extendSyntax({
	exports: 'true',
	type: "operand",
	name: "linepos",
	parser: function() {
		return {
			type: "Literal",
			value: "NEW OPERAND"
		};
	}	 
});
