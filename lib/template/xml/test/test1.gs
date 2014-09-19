import "gismo/template/xml"

var tmpl = xmlTemplate{<h1>Hallo Welt, die Antwort ist {12*2} <img src="hudel.gif" alt={ foo() } />&quot;&#65;&#x20;</h1>}

var tmpl2 = xmlTemplate{
	<ul>
		{foreach hossa}
			<li>Point {$data.name}</li>
		{/foreach}
	</ul>
	{if alright()}
		<p>Everything is alright</p>
	{/if}
}