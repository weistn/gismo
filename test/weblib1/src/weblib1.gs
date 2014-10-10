import "gismo/build"

console.log("MY RESOUCRCE style.css is at", resource('style.css'));

ifdef (parser.compiler.options.weblib) {
	console.log("I am running in a browser");
} else {
	console.log("I am running on node");
}