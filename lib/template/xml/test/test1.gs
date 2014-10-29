import "gismo/template/xml"
import "gismo/xml/dom"

function foo() {
	return "Some foo";
}

// var tmpl = xmlTemplate{<h1>Hallo Welt</h1>}

var tmpl = xmlTemplate(){<h1>Hallo Welt, die Antwort ist {12*2} <img src="hudel.gif" alt={ foo() } />&quot;&#65;&#x20;</h1><div/>}

var hossa = [
	{name: "Hudel"},
	{name: "Dudel"}
];

function alright() {
	return true;
}

var tmpl2 = xmlTemplate(){
	<ul>
		{foreach hossa}
			<li>Point {$data.name}</li>
		{/foreach}
	</ul>
	{if alright()}
		<p>Everything is alright</p>
	{/if}
	{tmpl(__doc)}
}

var ser = new dom.HTMLSerializer();
console.log(ser.serializeToString(tmpl()));
console.log(ser.serializeToString(tmpl2()));
