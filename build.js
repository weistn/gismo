var fs = require('fs');
var path = require('path');
var colors = require('colors');
var index = require('./index.js');

function buildModules(modulePath, options, inTest) {
//	console.log("Building", modulePath, "...");

	// Try to read package.json
	var pkg;
	try {
		if (!inTest) {
			pkg = JSON.parse(fs.readFileSync(path.join(modulePath, "package.json"), 'utf8'));
		}
	} catch(e) {
	}

	if (pkg && pkg.gismo && pkg.gismo.buildOrder) {
		for(var i = 0; i < pkg.gismo.buildOrder.length; i++) {
			if (!buildModules(path.join(modulePath, pkg.gismo.buildOrder[i]), options, false)) {
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
			var info = fs.statSync(path.join(modulePath, fname));
			if (info.isSymbolicLink()) {
				continue;
			}

			if (pkg && pkg.gismo && info.isDirectory() && fname === "test") {
				if (!buildModules(path.join(modulePath, fname), options, true)) {
					return false;
				}	
			} else if (info.isDirectory()) {
				if (!buildModules(path.join(modulePath, fname), options, false)) {
					return false;
				}
			}
		}
	}
	
	if (pkg && pkg.gismo && pkg.gismo.uniqueId) {
		console.log("Compile ", modulePath);
		index.compileModule(modulePath, options);
	}

	return true;
}

exports.buildModules = buildModules;