import "gismo/metaprogramming/codegen";

var b = identifier "foo";
// var b = "foo";
console.log(b);

var a = template(@b);
console.log(JSON.stringify(a));
var x = b.template;
console.log(x);
var foo = "bar";
//console.log(JSON.stringify(template(@identifier foo)));

console.log(JSON.stringify(identifier foo));
