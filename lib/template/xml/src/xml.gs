export function objectToNode(doc, obj) {
	switch(typeof obj) {
		case "Object":
			return obj;
		default:
			return doc.createTextNode(obj.toString());
	}
}