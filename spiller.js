var escodegen = require('escodegen');
var fs = require('fs');

function NodeJSSpiller(compiler) {
	this.program = {type: "Program", body: []};
    this.compiler = compiler;
}

NodeJSSpiller.prototype.addFile = function(filename, ast) {
    // Wrap each file in a function that is invoked to create a namespace
    ast = [{
        "type": "ExpressionStatement",
        "expression": {
            "type": "CallExpression",
            "callee": {
                "type": "FunctionExpression",
                "id": null,
                "params": [],
                "defaults": [],
                "body": {
                    "type": "BlockStatement",
                    "body": ast
                },
                "rest": null,
                "generator": false,
                "expression": false
            },
            "arguments": []
        }
    }];

	this.program.body = this.program.body.concat(ast);
};

NodeJSSpiller.prototype.spill = function() {
	// In which file should the generated JS be saved?
	var main = this.compiler.mainFile();

	// Generate JS code and source-map
	var result = escodegen.generate(this.program, {sourceMapWithCode: true, sourceMap: true, file: main});
	var code = result.code + "\n//# sourceMappingURL=" + main + ".map";

	// Write JS code and source-map to disk
	fs.writeFileSync(main, code);
	fs.writeFileSync(main + '.map', result.map.toString());
};

exports.NodeJSSpiller = NodeJSSpiller;
