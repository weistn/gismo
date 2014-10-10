var escodegen = require('escodegen');
var fs = require('fs');
var path = require('path');
var errors = require('./errors.js');

function NodeJSSpiller(compiler) {
	this.program = {type: "Program", body: []};
    this.compiler = compiler;
}

NodeJSSpiller.prototype.addFile = function(filename, ast, src, action) {
    // Ignore all files that are not compiled to an AST
    if (!ast) {
        return;
    }

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

NodeJSSpiller.prototype.addDependency = function(modulePath, pkg, alias, name, isMeta) {
    // Do nothing by intention
};

//
// WeblibSpiller
//

function WeblibSpiller(compiler) {
    this.compiler = compiler;
    // Imports of the entire module
    this.imports = [];
    // Imports of the currently compiling module
    this.fileImports = [];
    // List of compiled modules
    this.files = [];
    this.resources = [];
    this.program = {type: "Program", body: []};
    this.body = [{
        type: "VariableDeclaration",
        declarations: [
            {type: "VariableDeclarator", init: {type: "ObjectExpression", properties: [{
                type: "Property",
                key: {
                    type: "Identifier",
                    name: "exports"
                },
                kind: "init",
                value: {
                    type: "ObjectExpression",
                    properties: []
                }
            }]}, id: {type: "Identifier", name: "module"} },
            {type: "VariableDeclarator", init: {
                type: "MemberExpression",
                computed: false,
                object: {
                    type: "Identifier",
                    name: "module"
                },
                property: {
                    type: "Identifier",
                    name: "exports"
                }
            }, id: {type: "Identifier", name: "exports"} }
        ],
        kind: "var"
    }];
}

// Takes an import path such as 'gismo/template/dom' and turns it into an identifier like 'gismo_template_dom'.
WeblibSpiller.prototype.normalizeName = function(name) {
    return name.replace(/^[./]*/,"").replace(/[\/\\.]/g, "_");
};

// Determines where to write the main JS file
WeblibSpiller.prototype.webMainFile = function() {
    var main;
    // Deploy into a web application directory?
    if (this.compiler.options.deploy || this.compiler.options.deployall) {
        // Determine in which directory we should deploy
        var to = this.compiler.deployTo();
        if (this.compiler.isFile) {
            // A single file? It will keep its name.
            var base = path.basename(this.compiler.path);
            main = path.join(to, base.slice(0, base.length - 3) + ".js");
        } else {
            // A module? It will be renamd to main.js
            main = path.join(to, this.compiler.pkg.weblib ? this.compiler.pkg.weblib : "main.js");
        }
    } else {
        // Just compile
        if (this.compiler.isFile) {
            // A single file named "test.gs" is compiled to "test.weblib.js" in the same directory
            main = this.compiler.path.slice(0, this.compiler.path.length - 3) + ".weblib.js";
        } else {
            // A module is compiled to a file called "weblib.js" located in the module's directory
            main = path.join(this.compiler.path, this.compiler.pkg.weblib ? this.compiler.pkg.weblib : "weblib.js");
        }        
    }
    return path.resolve(main);
};

WeblibSpiller.prototype.addFile = function(filename, ast, src, action) {
    var file = {
        filename: filename,
        source: src,
        action: action
    };
    this.files.push(file);

    if (action.action === "copy") {
        this.resources.push(file);
        return;
    }

//    console.log(JSON.stringify(ast, null, "\t"));

    // Wrap each file in a function that is invoked to create a namespace
    var dependencies = [];
    var aliases = [];
    for(var i = 0; i < this.fileImports.length; i++) {
        if (this.fileImports[i].meta) {
            continue;
        }
        dependencies.push({
            type: "Identifier",
            name: this.normalizeName(this.imports[i].name)
        });
        aliases.push({
            type: "Identifier",
            name: this.fileImports[i].alias
        });
    }

    this.body.push({
        "type": "ExpressionStatement",
        "expression": {
            "type": "CallExpression",
            "callee": {
                "type": "FunctionExpression",
                "id": null,
                "params": aliases,
                "defaults": [],
                "body": {
                    "type": "BlockStatement",
                    "body": ast
                },
                "rest": null,
                "generator": false,
                "expression": false
            },
            "arguments": dependencies
        }
    });

    this.fileImports = [];
};

WeblibSpiller.prototype.spill = function() {
    if (this.compiler.options.deploy || this.compiler.options.deployall) {
        var to = this.compiler.deployTo();
        if (!fs.existsSync(to)) {
            fs.mkdirSync(to);
        }
    }

    this.body.push({
        type: "ReturnStatement",
        argument: {type: "Identifier", name: "exports"}
    });

    var dependencies = [];
    var aliases = [];
    for(var i = 0; i < this.imports.length; i++) {
        if (this.imports[i].meta) {
            continue;
        }
        dependencies.push({
            type: "Literal",
            value: this.imports[i].pkg.gismo.uniqueId
        });
        aliases.push({
            type: "Identifier",
            name: this.normalizeName(this.imports[i].name)
        });
    }

    this.program.body.push({
        type: "ExpressionStatement",
        expression: {
            type: "CallExpression",
            callee: {
                type: "Identifier",
                name: "define"
            },
            arguments: [
                {
                    type: "ArrayExpression",
                    elements: dependencies
                },
                {
                    type: "FunctionExpression",
                    id: null,
                    params: aliases,
                    defaults: [],
                    rest: null,
                    generator: false,
                    expression: false,
                    body: {
                        type: "BlockStatement",
                        body: this.body
                    }
                }
            ]
        }
    });

    // In which file should the generated JS be saved?
    var mainFile = this.compiler.mainFile();
    var webMainFile = this.webMainFile();

    // Touch the main file if it does not exist, since otherwise nodejs will not recognize the directory as a module
    if (!fs.existsSync(mainFile)) {
        fs.writeFileSync(mainFile, "throw 'This module has been compiled for the web, not for nodejs.'");        
    }

    // Generate JS code and source-map
    var result = escodegen.generate(this.program, {sourceMapWithCode: true, sourceMap: true, file: webMainFile});
    var code = result.code + "\n//# sourceMappingURL=./" + path.basename(webMainFile) + ".map";

    // Add source code right to the generated source-map.
    for(var i = 0; i < this.files.length; i++) {
        if (this.files[i].action.action !== "compile") {
            continue;
        }
        result.map.setSourceContent(this.files[i].filename, this.files[i].source);
    }

    // Write JS code and source-map to disk
    fs.writeFileSync(webMainFile, code);
    fs.writeFileSync(webMainFile + '.map', result.map.toString());

    // Write the 'resources.json' file
    var resources = {
        files: []
    };
    for(var i = 0; i < this.resources.length; i++) {
        resources.files.push(this.resources[i].filename);
    }
    fs.writeFileSync(path.join(path.dirname(this.compiler.mainFile()), "resources.json"), JSON.stringify(resources));

    if (this.compiler.options.deployall) {
        // Copy requirejs
        try {
            var rjs = require.resolve("requirejs");
            // rjs will end in '/bin/r.js' which must be stripped off
            var rjsFile = path.join(path.dirname(path.dirname(rjs)), "require.js");
            var data = fs.readFileSync(rjsFile);
            fs.writeFileSync(path.join(this.compiler.deployTo(), "require.js"), data);
        } catch(e) {
            throw new errors.CompilerError("Install require.js, because it is required for browser support");
        }

        // Copy all source files that have not been compiled
        for(var i = 0; i < this.files.length; i++) {
            var f = this.files[i];
            if (f.action.action === "copy") {
                var dest = path.join(this.compiler.deployTo(), path.basename(f.filename));
                try {
                    var data = fs.readFileSync(f.filename);
                    fs.writeFileSync(dest, data);
                } catch(e) {
                    throw new errors.CompilerError("Could not copy '" + f.filename + "' to '" + dest + "'");
                }
            }
        }
        // Copy all dependencies
        this.copyDependencies(this.compiler.deployTo(), this.imports);
    }
};

WeblibSpiller.prototype.copyDependencies = function(libPath, imports) {
    for(var i = 0; i < imports.length; i++) {
        var imp = imports[i];
        if (imp.meta) {
            continue;
        }
        // Try to read the package.json
        var pkg, deps;
        try {
            pkg = JSON.parse(fs.readFileSync(path.join(imp.module, 'package.json'), 'utf8'));
        } catch(err) {
            throw new errors.CompilerError("Path " + imp.module + " does not contain a module (missing package.json)");
        }
        // Try to load dependencies.json
        try {
            deps = JSON.parse(fs.readFileSync(path.join(imp.module, 'dependencies.json'), 'utf8'));
        } catch(err) {
            throw new errors.CompilerError("Path " + imp.module + " does not contain module dependencies (missing dependencies.json");
        }
        // Try to load the weblib file and its source-map
        var src = path.join(imp.module, pkg.weblib ? pkg.weblib : "weblib.js");
        var srcMap = path.join(imp.module, pkg.weblib ? pkg.weblib : "weblib.js.map");
        var content, contentMap;
        try {
            content = fs.readFileSync(src);
            contentMap = fs.readFileSync(srcMap);
        } catch(err) {
            throw new errors.CompilerError("Path " + imp.module + " is not compiled for use in the browser (missing " + src + ")");            
        }
        // Adjust the source-map line
        var lines = content.toString().split("\n");
        lines[lines.length - 1] = "//# sourceMappingURL=./" + imp.uniqueId + ".js.map";
        content = lines.join("\n");
        // Write the weblib file and the source-map
        var dest = path.join(libPath, imp.uniqueId + ".js");
        var destMap = path.join(libPath, imp.uniqueId + ".js.map");
        try {
            fs.writeFileSync(dest, content);
            fs.writeFileSync(destMap, contentMap);
        } catch(err) {
            throw new errors.CompilerError("Could not write to " + dest);
        }

        // Try to read 'resources.json'
        try {
            var resources = JSON.parse(fs.readFileSync(path.join(imp.module, "resources.json"), 'utf8'));
        } catch(e) {
            // Do nothing by intention
        }
        if (resources) {
            for(var i = 0; i < resources.files.length; i++) {
                var dest = path.join(libPath, imp.uniqueId + "-" + path.basename(resources.files[i]));
                try {
                    var data = fs.readFileSync(resources.files[i]);
                    fs.writeFileSync(dest, data);
                } catch(e) {
                    throw new errors.CompilerError("Could not copy '" + resources.files[i] + "' to '" + dest + "'")
                }
            }
        }

        // Recursion
        this.copyDependencies(libPath, deps.imports);
    }
};

WeblibSpiller.prototype.addDependency = function(modulePath, pkg, alias, name, isMeta) {
    this.imports.push({
        name: name,
        module: modulePath,
        alias: alias,
        meta: isMeta,
        uniqueId: pkg.gismo ? pkg.gismo.uniqueId : null,
        pkg: pkg
    });
    this.fileImports.push({
        name: name,
        module: modulePath,
        alias: alias,
        meta: isMeta,
        uniqueId: pkg.gismo ? pkg.gismo.uniqueId : null,
        pkg: pkg
    });
};

//
// DependenciesSpiller
//

function DependenciesSpiller(compiler) {
    this.compiler = compiler;
    this.imports = [];
}

DependenciesSpiller.prototype.addFile = function(filename, ast, src, action) {
    // Do nothing by intention
};

DependenciesSpiller.prototype.spill = function() {
    fs.writeFileSync(path.join(path.dirname(this.compiler.mainFile()), "dependencies.json"), JSON.stringify({imports: this.imports}, null, "\t"));

    if (this.compiler.options.graphviz) {
        var nodes = {};
        var edges = [];
        var name = path.basename(this.compiler.path);
        nodes[name] = {name: name, color: "black"};
        this.spillGraphvizAll(name, {imports: this.imports}, nodes, edges);

        var code = ["Digraph G {"];
        var i = 1;
        for(var key in nodes) {
            var node = nodes[key];
            node.id = "node" + (i++).toString();
            code.push(node.id + " [shape=box, color=" + node.color + ', label="' + node.name + '"]');
        }
        for(var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            code.push(nodes[edge.from].id + " -> " + nodes[edge.to].id + " [color=" + edge.color + "]");
        }
        code.push("}");
        fs.writeFileSync(path.join(path.dirname(this.compiler.mainFile()), "dependencies.dot"), code.join("\n"));
    }
};

DependenciesSpiller.prototype.spillGraphvizAll = function(name, imports, nodes, edges) {
    for(var i = 0; i < imports.imports.length; i++) {
        var imp = imports.imports[i];
        this.spillGraphvizOne(imp, nodes, edges);
    }
    for(var i = 0; i < imports.imports.length; i++) {
        var imp = imports.imports[i];
        edges.push({from: name, to: imp.name, color: imp.meta ? "red" : "black"});
    }
};

DependenciesSpiller.prototype.spillGraphvizOne = function(imp, nodes, edges) {
    // Try to read the package.json
    var pkg, imports;
    try {
        pkg = JSON.parse(fs.readFileSync(path.join(imp.module, 'package.json'), 'utf8'));
        imports = JSON.parse(fs.readFileSync(path.join(imp.module, 'dependencies.json'), 'utf8'));
    } catch(err) {
        nodes[imp.name] = {name: imp.name, color: "red"};
        return;
    }

    nodes[imp.name] = {name: imp.name, color: "black"};
    this.spillGraphvizAll(imp.name, imports, nodes, edges);
};

DependenciesSpiller.prototype.addDependency = function(modulePath, pkg, alias, name, isMeta) {
    this.imports.push({
        name: name,
        module: modulePath,
        alias: alias,
        meta: isMeta,
        uniqueId: pkg.gismo ? pkg.gismo.uniqueId : null
    });
};

exports.WeblibSpiller = WeblibSpiller;
exports.NodeJSSpiller = NodeJSSpiller;
exports.DependenciesSpiller = DependenciesSpiller;