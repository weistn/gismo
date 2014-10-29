import "gismo/build"

var ELEMENT_NODE				= 1;
var ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = 8;
var DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = 12;

function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}

export function HTMLSerializer() {
}

HTMLSerializer.prototype.serializeToString = function(node) {
	var buf = [];
	serializeToString(node,buf);
	return buf.join('');
};

function serializeToString(node, buf) {
	switch(node.nodeType){
	case ELEMENT_NODE:
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		buf.push('<',nodeName);
		for(var i = 0; i < len; i++) {
			serializeToString(attrs.item(i), buf);
		}
		if(child || !/^(?:meta|link|img|br|hr|input|area|base|col|command|embed|param|source)$/i.test(nodeName)) {
			buf.push('>');
			//if is cdata child node
			if(/^script$/i.test(nodeName)){
				if(child){
					buf.push(child.data);
				}
			}else{
				while(child){
					serializeToString(child,buf);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else{
			buf.push('>');
		}
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return buf.push(' ',node.name,'="',node.value.replace(/[<&"]/g,_xmlEncoder),'"');
	case TEXT_NODE:
		return buf.push(node.data.replace(/[<&]/g,_xmlEncoder));
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if (pubid) {
			buf.push(' PUBLIC "',pubid);
			if (sysid && sysid!='.') {
				buf.push( '" "',sysid);
			}
			buf.push('">');
		} else if(sysid && sysid!='.') {
			buf.push(' SYSTEM "',sysid,'">');
		} else {
			var sub = node.internalSubset;
			if (sub) {
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
};

ifdef (parser.getCompiler().options.weblib) {
	export function Document() {
		return document.implementation.createDocument(null, null, null);
	}

	export function XMLSerializer() {
		return new XMLSerializer();
	}

} else {
	var xmldom = require('xmldom');

	export function Document() {
		return (new xmldom.DOMImplementation).createDocument();
	}

	export function XMLSerializer() {
		return new xmldom.XMLSerializer();
	}
}