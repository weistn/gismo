import "gismo/template/dom"
import "./test/weblib1"

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
var person = {
	_name: "Horst",
	_adult: true,
	get name() { return this._name; },
	set name(value) {
		this._name = value;
		dom.__triggerUpdate();
	},
	get adult() { return this._adult; },
	set adult(value) {
		this._adult = value;
		dom.__triggerUpdate();
	}
}

// <div style={{fontWeight:..., color:xxxx}} class={{important: ....}}

var tmpl1 = domTemplate(css){
	<p class={css} style={{color: hossa.length > 3 ? "green" : "black"}}>Length is {hossa.length}</p>
};

var tmpl1b = domTemplate(css){
	<p class={css}>A length of {hossa.length} is small</p>
};

var tmpl2 = domTemplate(){
	<ul>
		{foreach hossa}
			<li class={$data.cssClass}>Point number {$index} is {$data.name}</li>
		{/foreach}
	</ul>
	{if alright}
		<p class={{green: hossa.length > 3}}>Everything is alright</p>
		<p>Let us go on</p>
	{/if}
	{hossa.length <= 2 ? new tmpl1b(hossa[0].cssClass) : new tmpl1(hossa[0].cssClass)}
	<div>
		<input type="text" value={person.name} /> is {person.name}
	</div>
	<div>
		<textarea value={person.name} /> is {person.name.length > 10 ? person.name.slice(0,10) + "..." : person.name}
	</div>
	<div>
		<input type="checkbox" checked={person.adult} /> {if person.adult}is over 18{/if}
		<input type="checkbox" checked={person.adult} />
	</div>
}

window.createControl = function() {
    var instance = new tmpl2();
    dom.__registerWidget(instance);
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

window.createControl();


