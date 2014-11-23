var fs = require('fs');
var path = require('path');
var colors = require('colors');
var index = require('./index.js');
var compiler = require('./compiler.js');
var errors = require('./errors.js');

function Builder(modulePath, options, version) {
	this.modulePath = modulePath;
	this.options = options;
	this.version = version;
	this.spillers = [];
}

Builder.prototype.build = function() {
	if (!this.buildModules(this.modulePath, [], this.options, false, this.version)) {
		return false;
	}
}

/// Sets the spiller that is used by the compiler to generate output.
Builder.prototype.addSpiller = function(name, spiller) {
	console.log("SET SPILLER", name);
	this.spillers.push({spiller: spiller, name: name});
};

/// Returns the spiller used by the compiler to generate output.
Builder.prototype.getSpiller = function(name) {
	for(var i = 0; i < this.spillers.length; i++) {
		if (this.spillers[i].name === name) {
			return this.spillers[i].spiller;
		}
	}
	return null;
};

Builder.prototype.buildModules = function(modulePath, spillerPath, options, inTest, version) {
	var index = this.spillers.length;

	if (!this.buildModules2(modulePath, spillerPath, options, inTest, version)) {
		return false;
	}

	while(index < this.spillers.length) {
		var s = this.spillers.pop();
		s.spiller.spill();
	}

	return true;
};

Builder.prototype.buildModules2 = function(modulePath, spillerPath, options, inTest, version) {
//	console.log("Building", modulePath, "...");

	// Try to read package.json
	var pkg;
	try {
		if (!inTest) {
			pkg = JSON.parse(fs.readFileSync(path.join(modulePath, "package.json"), 'utf8'));
		}
	} catch(e) {
	}

	// Is there something to compile? Documentation or code?
	var comp;
	if (pkg && pkg.gismo && (pkg.gismo.uniqueId || (options.doc && pkg.gismo.docModule))) {
		var opt = { };
		for(var key in options) {
			opt[key] = options[key];
		}
		// Generate doc only but no code?
		if (pkg.gismo.docModule && !pkg.gismo.uniqueId) {
			opt.nocode = true;
		}
		try {
			comp = new compiler.Compiler(this, modulePath, opt, version);
		} catch(err) {
			index.displayError(err);
			return false;
		}
	}

	if (comp && comp.isModuleMode()) {
		for(var i = 0; i < this.spillers.length; i++) {
			this.spillers[i].spiller.addModule(spillerPath, comp, pkg)
		}
	}

	if (pkg && pkg.gismo && pkg.gismo.buildOrder) {
		for(var i = 0; i < pkg.gismo.buildOrder.length; i++) {
			if (!this.buildModules(path.join(modulePath, pkg.gismo.buildOrder[i]), spillerPath.concat(pkg.gismo.buildOrder[i]), options, false, version)) {
				return false;
			}
		}
	} else {
		try {
			var filenames = fs.readdirSync(modulePath).sort();
		} catch(e) {
			console.log(("Directory " + modulePath + " does not exist. Check package.json on the parent directory").blue);
			return false;
		}
		for(var i = 0; i < filenames.length; i++) {
			var fname = filenames[i];
			if (fname === ".DS_Store") {
				continue;
			}
			var info = fs.statSync(path.join(modulePath, fname));
			if (info.isSymbolicLink()) {
				continue;
			}

			if (pkg && pkg.gismo && info.isDirectory() && fname === "test") {
				if (!this.buildModules(path.join(modulePath, fname), spillerPath.concat(fname), options, true, version)) {
					return false;
				}	
			} else if (info.isDirectory()) {
				if (!this.buildModules(path.join(modulePath, fname), spillerPath.concat(fname), options, false, version)) {
					return false;
				}
			}
		}
	}
	
	if (comp) {
		console.log("Compile ", modulePath);
//		index.compileModule(modulePath, options);
		try {
			comp.compileModule();
		} catch(err) {
			index.displayError(err);
			return false;
		}
	}

	return true;
}

Builder.prototype.throwError = function(token, messageFormat) {
    var error,
        args = Array.prototype.slice.call(arguments, 2),
        msg = messageFormat.replace(
            /%(\d)/g,
            function (whole, index) {
                if (index >= args.length)
                	throw new Error('Implementation Error: Message reference must be in range');
                return args[index];
            }
        );

    var error = new errors.CompilerError(msg);
    throw error;
}

exports.Builder = Builder;