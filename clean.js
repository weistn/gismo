var fs = require('fs');
var path = require('path');
var colors = require('colors');

function cleanModule(modulePath, recursive, inTest) {
	console.log("Cleaning", modulePath, "...");

	// Try to read package.json
	var pkg;
	try {
		if (!inTest) {
			pkg = JSON.parse(fs.readFileSync(path.join(modulePath, "package.json"), 'utf8'));
		}
	} catch(e) {
		if (!recursive) {
			console.log((modulePath + " is not a gismo module").red);
			return;
		}
	}

	var filenames = fs.readdirSync(modulePath).sort();
	for(var i = 0; i < filenames.length; i++) {
		var fname = filenames[i];
		var info = fs.statSync(path.join(modulePath, fname));
		if (info.isSymbolicLink()) {
			continue;
		}

		var del = false;
		if (pkg && pkg.gismo && (fname === "dependencies.json" || fname === "dependencies.dot" || fname === "resources.json")) {
			del = true;
		} else if (fname === "package.json") {
			// Do not delete this file
		} else if (pkg && pkg.gismo && info.isDirectory() && (fname === pkg.gismo.deployTo || (!pkg.gismo.deployTo && fname === "deploy"))) {
			deleteRecursively(path.join(modulePath, fname));
		} else if (inTest && fname === "deploy") {
			deleteRecursively(path.join(modulePath, fname));
		} else if (pkg && pkg.gismo && (fname === pkg.main || (!pkg.main && fname === "main.js"))) {
			del = true;
		} else if (pkg && pkg.gismo && (fname === pkg.gismo.metaFile || (!pkg.gismo.metaFile && fname === "_meta.js"))) {
			del = true;
		} else if (pkg && pkg.gismo && fname === "weblib.js") {
			del = true;
		} else if (pkg && pkg.gismo && info.isDirectory() && (fname === "src" || fname === "compiler")) {
			// No need to investigate these recursively
		} else if (pkg && pkg.gismo && info.isDirectory() && fname === "test") {
			cleanModule(path.join(modulePath, fname), recursive, true);			
		} else {
			if (info.isDirectory()) {
				if (!recursive) {
					continue;
				}
				cleanModule(path.join(modulePath, fname), true, false);
			} else if (info.isFile()) {
				if (!inTest && (!pkg || !pkg.gismo)) {
					// Outside of gismo packages and test setups, do not delete any files
					continue;
				}
				var idx = fname.lastIndexOf(".");
				if (idx !== -1 && fname.slice(idx, fname.length) === ".map") {
					del = true;
				}
				if (fname[0] === "." && idx !== -1 && fname.slice(idx, fname.length) === ".js") {
					del = true;
				}
				var idx = fname.lastIndexOf(".weblib");
				if (idx !== -1 && fname.slice(idx, fname.length) === ".map") {
					del = true;
				}
			}
		}
		if (del) {
			console.log("Deleting file", path.join(modulePath, fname));
		}
	}
}

function deleteRecursively(dir) {
	console.log("Deleting recursively", dir, "...");
	var filenames = fs.readdirSync(dir).sort();
	for(var i = 0; i < filenames.length; i++) {
		var fname = filenames[i];
		var info = fs.statSync(path.join(dir, fname));
		if (info.isSymbolicLink()) {
			continue;
		}
		if (!info.isDirectory()) {
			console.log("Deleting file", path.join(dir, fname));
		} else {
			deleteRecursively(path.join(dir, fname));
		}
	}
	console.log("Deleting directory", dir);
}

exports.cleanModule = cleanModule;