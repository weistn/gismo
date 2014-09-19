import "gismo/template/dom"


var tmpl = domTemplate{<h1>Hallo Welt, die Antwort ist {12*2} <img src="hudel.gif" alt={ foo() } />&quot;&#65;&#x20;</h1>}

var tmpl2 = domTemplate{
	<ul>
		{foreach hossa}
			<li>Point {$data.name}</li>
		{/foreach}
	</ul>
	{if alright()}
		<p>Everything is alright</p>
	{/if}
}
