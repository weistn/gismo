import "gismo/xml/dom"

export function objectToNode(doc, obj) {
	switch(typeof obj) {
		case "object":
			return obj;
		default:
			return doc.createTextNode(obj.toString());
	}
}

module.exports.xmldom = dom;
