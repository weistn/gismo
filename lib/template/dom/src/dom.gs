export function objectToNode(doc, obj) {
	switch(typeof obj) {
		case "object":
			// TODO: Check that this a a dom node
			return obj;
		case "function":
			return obj();
		default:
			return doc.createTextNode(obj.toString());
	}
}