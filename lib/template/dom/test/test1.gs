var require = function() {
	var ns = {
		objectToNode: function(doc, obj) {
			switch(typeof obj) {
			case "function":
				return ns.objectToNode(obj());					
			case "object":
				if (obj instanceof ns.Widget) {
					return obj;
				} else if (typeof(obj.nodeType) === "number") {
					return obj;
				} 
				// Break left out intentionally
			default:
				return doc.createTextNode(obj.toString());
			}
		},

		Widget: function() {
		}

	};

	return ns;
};

import "gismo/template/dom"

var tmpl = domTemplate(){<h1>Hallo Welt, die Antwort ist {12*2} <img src="hudel.gif" alt={ foo() } />&quot;&#65;&#x20;</h1>}

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

var tmpl1 = domTemplate(css){
	<p class={css}>Length is {hossa.length}</p>
};

var tmpl1b = domTemplate(css){
	<p class={css}>A length of {hossa.length} is small</p>
};

var tmpl2 = domTemplate(){
	<ul>
		{foreach hossa}
			<li class={$data.cssClass}>Point {$data.name}</li>
		{/foreach}
	</ul>
	{if alright}
		<p>Everything is alright</p>
		<p>Let us go on</p>
	{/if}
	{hossa.length <= 2 ? new tmpl1b(hossa[0].cssClass) : new tmpl1(hossa[0].cssClass)}
}

window.createControl = function() {
    var instance = new tmpl2();
    var frag = instance.create();
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

