var require = function() {
	var ns = {
		objectToNode: function(doc, obj) {
			switch(typeof obj) {
				case "Object":
					return obj;
				case "Function":
					return obj();					
				default:
					return doc.createTextNode(obj.toString());
			}
		},

		Widget: function() {
		},

		isWidget: function(w) {

		}
	};

	return ns;
};

import "gismo/template/dom"

var tmpl = domTemplate{<h1>Hallo Welt, die Antwort ist {12*2} <img src="hudel.gif" alt={ foo() } />&quot;&#65;&#x20;</h1>}

var hossa = [
	{
		name: "Hudel",
		cssClass: ""
	},
	{
		name: "Dudel",
		cssClass: ""
	}
];
var alright = true;

// <div style."font-weight"={....} class."super"={...}

var tmpl1 = domTemplate{
	<p>Length is {hossa.length}</p>
};

var tmpl2 = domTemplate{
	<ul>
		{foreach hossa}
			<li class={$data.cssClass}>Point {$data.name}</li>
		{/foreach}
	</ul>
	{if alright}
		<p>Everything is alright</p>
		<p>Let us go on</p>
	{/if}
}

window.createControl = function() {
    var instance = tmpl2();
    var frag = instance.getFragment();
    console.log(frag);
    document.getElementById('main').appendChild(frag);
    document.getElementById("button").addEventListener("click", function() {
    	alright = !alright;
    	instance.update();
    });
    document.getElementById("button2").addEventListener("click", function() {
		hossa = [
			{
				name: "One",
				cssClass: ""
			},
			{
				name: "Two",
				cssClass: ""
			},
			{
				name: "Three",
				cssClass: ""
			}
		];    	
    	instance.update();
    });
    document.getElementById("button3").addEventListener("click", function() {
    	hossa.splice(1,1);
    	hossa.splice(2, 0, {
    		name: "Four",
    		cssClass: ""
    	},
    	{
    		name: "Five",
    		cssClass: ""
    	});
    	console.log(hossa);
    	hossa.changes = [
    		{
    			type: "skip",
    			length: 1
    		},
    		{
    			type: "del",
    			length: 1
    		},
    		{
    			type: "skip",
    			length: 1
    		},
    		{
    			type: "ins",
    			length: 2
    		}
    	];
    	instance.update();
    	hossa.changes = null;
    });
    document.getElementById("button4").addEventListener("click", function() {
    	hossa[0].cssClass = "red";
    	instance.update();    	
    });
    document.getElementById("button5").addEventListener("click", function() {
    	hossa[0].name = "Change!";
    	instance.update();    	
    });
}

