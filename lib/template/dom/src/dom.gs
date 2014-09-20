export function objectToNode(doc, obj) {
	switch(typeof obj) {
		case "Object":
			// TODO: Check that this a a dom node
			return obj;
		case "Function":
			return obj();
		default:
			return doc.createTextNode(obj.toString());
	}
}