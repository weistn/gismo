export function objectToNode(doc, obj) {
	switch(typeof obj) {
	case "function":
		return objectToNode(obj());					
	case "object":
		if (obj instanceof Widget) {
			return obj;
		} else if (typeof(obj.nodeType) === "number") {
			return obj;
		} 
		// Break left out intentionally
	default:
		return doc.createTextNode(obj.toString());
	}
}

export function Widget() {
}

export function __addClass(element, clas) {
	var lst = element.getAttribute("class");
	var classes = lst ? lst.split(" ") : [];
	if (classes.indexOf(clas) == -1 ) {
		classes.push(clas);
		element.setAttribute("class", classes.join(" "));
	}
}

export function __removeClass(element, clas) {
	var lst = element.getAttribute("class");
	var classes = lst ? lst.split(" ") : [];
	var idx = classes.indexOf(clas);
	if (idx != -1 ) {
		classes.splice(idx, 1);
		element.setAttribute("class", classes.join(" "));
	}
}

var widgets = { };

var widgetCounter = 0;

function __update() {
	for(var k in widgets) {
		var w = widgets[k];
		console.log("__update");
		w.update();
	}
}

export function __registerWidget(w) {
	w.__id = (widgetCounter++).toString();
	widgets[w.__id] = w;
}

export function __deregisterWidget(w) {
	delete widgets[w.__id];
}

var timeout = null;

var updaters = [];

export function __registerUpdater(self, f) {
	updaters.push({func: f, obj: self});
	if (!timeout) {
		timeout = window.setTimeout(__onTimeout, 0);
	}
}

var updateRequired = false;

export function __triggerUpdate() {
	updateRequired = true;
	if (!timeout) {
		timeout = window.setTimeout(__onTimeout, 0);
	}
}

function __onTimeout() {
	for(var i = 0; i < updaters.length; i++) {
		updateRequired |= updaters[i].func.call(updaters[i].obj);
	}
	updaters = [];
	if (updateRequired) {
		__update();
		updateRequired = false;
	}
	timeout = null;
}
