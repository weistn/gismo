import "gismo/template"
import "gismo/metaprogramming"
import "gismo/template/xml/parser" as xmlparser

var counter = 0;

export operator domTemplate {
	parser.tokenizer.expect("{");
	var ast = xmlparser.parseFragment(parser);
	parser.tokenizer.expect("}");

	if (ast === null) {
		ast = [];
	}

	var code = template{
		var __children = [], __destructors = []; 
		var __instance = {
		};

		__instance.getFragment = function() {
			var __f = document.createDocumentFragment();
			for(var __i = 0; __i < __children.length(); __i++) {
				__f.appendChild(__children[__i]);
			}
			return __f;	
		};

		__instance.destroy = function() {
			__children = null;
			for(var __i = 0; __i < __destructors.length; __i++) {
				__destructors[__i]();
			}
		};

		var __parent = document.createDocumentFragment(), __node, $data;
	};

	var updateCode = [];

//	console.log(JSON.stringify(ast, null, "\t"));
	counter = 0;
	generateContent(code, updateCode, ast);

	code = code.concat(template{
		__instance.update = function() {
			@updateCode
		};

		for(var __i = 0; __i < __parent.children.length; __i++ ) {
			__children.push(__parent.children[i]);
		}

		return __instance;
	});

	return template(function(){@code});
}

function generateContent(code, updateCode, ast) {
	for(var i = 0; i < ast.length; i++) {
		var a = ast[i];
		switch (a.type) {
			case "Element":
				code.push(template{ __node = document.createElement(@(literal a.nodeName.name)) });
				if (a.attributes) {
					for(var j = 0; j < a.attributes.length; j++) {
						var attr = a.attributes[j];
						if (attr.value.type === "Code") {
							code.push(template{ __node.setAttribute(@(literal attr.name.name), @(attr.value.expr)); });
						} else {
							code.push(template{ __node.setAttribute(@(literal attr.name.name), @(literal attr.value.value)); });
						}
					}
				}
				if (a.content) {
					code.push(template{ __parent = __node; })
					generateContent(code, updateCode, a.content);					
					code.push(template{ __parent = __parent.parentNode; })
				} else {
					code.push(template{ __parent.appendChild(__node); });
				}
				break;
			case "Text":
				if ((i === 0 || i + 1 === ast.length) && a.value.trim() === "") {
					continue;
				}
				code.push(template{ __node = document.createTextNode(@(literal a.value)); });
				code.push(template{ __parent.appendChild(__node); });
				break;
			case "Code":
				code.push(template{ __node = @(identifier parser.importAlias(module)).objectToNode(document, @(a.expr)); });
				code.push(template{ if (__node) __parent.appendChild(__node); });
				break;
			case "Foreach":
				if (a.content.length === 0) {
					continue;
				}
				var arrname = identifier "__arr_" + (counter).toString();
				var newarrname = identifier "__newarr_" + (counter).toString();
				var items = identifier "__items_" + (counter).toString();
				var comment = identifier "__comment_" + (counter).toString();
				var create = identifier "__create_" + counter.toString();
				var destroy = identifier "__destroy_" + counter.toString();
				var createAll = identifier "__createAll_" + counter.toString();
				var destroyAll = identifier "__destroyAll_" + counter.toString();
				code.push(template{ var @arrname = @(a.expr), @items, @newarrname, @comment; });

				// Process the content inside th foreach-clause
				var content = [];
				var updateContent = [];
				generateContent(content, updateContent, a.content);

				// Code to create and destroy the content
				code.push.apply(code, template{
					function @createAll() {
						var __parent = document.createDocumentFragment();
						// A placeholder in case the array is empty
						__parent.appendChild(@comment = document.createComment("placeholder"));
						@items = [];
						if (@arrname) {
							var __len = @arrname.length;
							for(var __i = 0; __i < __len; __i++) {
								var __item = {};
								__parent.appendChild(@create(item, @arrname[__i]));
								@items.push(__item);
							}
						}
						return __parent;						
					}

					function @destroyAll() {
						for(var __i = 0; __i < @items.length; __i++) {
							@destroy(@items[__i]);
						}
						@items = null;
						@comment = null;
						@arrname = null;
					}
					__destructors.push(@destroyAll);

					function @create(__item, $data) {
						var __parent = document.createDocumentFragment();
						var __destructors = [];
						@content
						__item.destructors = __destructors;
						__item.nodes = [];
						for(var __i = 0; __i < __parent.children.length; __i++) {
							__item.nodes.push(__parent.children[__i]);
						}
						__item.update = function() {
							@updateContent
						};
						return __parent;
					}

					function @destroy(item) {
						for(var __i = 0; __i < item.destructors.length; __i++) {
							item.destructors[__i]();
						}
					}
				});

				// Render the code
				code.push(template{
					__parent.appendChild(@createAll());
				});

				// Code that updates the DOM as data changes
				updateCode.push.apply(updateCode, template{
					// The foreach-expression changed? Then replace everything
					@newarrname = @(a.expr);
					if (@arrname != @newarrname) {
						var __oldcomment = @newnodes.children[0];
						@destroyAll();
						@arrname = @newarrname;
						@newnodes = @create();
						// Insert the new nodes instead of the old nodes
						@nodes[0].parentNode.insertBefore(@newnodes, __oldcomment);
						for(var __i = 0; __i < @items.length; __i++) {
							var __item = @items[i];
							for(var __i = 0; __i < __item.nodes.length; __i++) {
								__oldcomment.parentNode.removeChild(__item.nodes[__i]);
							}
						}
						__oldcomment.parentNode.removeChild(__oldcomment);
						@newnodes = null;
					} else {
						if (@arrname.changes) {
							// TODO: Handles removals or insertions
						} else {
							// No changes to the array itself. See if any item needs updating
							for (var __i = 0; __i < @items.length; __i++) {
								@items[__i].update();
							}
						}
					}
				});
				break;
			case "If":
				if (a.content.length === 0) {
					continue;
				}
				var create = identifier "__create_" + counter.toString();
				var destroy = identifier "__destroy_" + counter.toString();
				var destructors = identifier "__destructors_" + counter.toString();
				var nodes = identifier "__nodes_" + counter.toString();
				var newnodes = identifier "__newnodes_" + counter.toString();
				var state = identifier "__state_" + (counter++).toString();
				code.push(template{ var @state = !!@(a.expr), @nodes, @newnodes, @destructors; });

				// Process the content inside th if-clause
				var content = [];
				var updateContent = [];
				generateContent(content, updateContent, a.content);

				// Code to create and destroy the content
				code.push.apply(code, template{
					function @create() {
						if (!@state) {
							return document.createComment("placeholder");
						}
						var __parent = document.createDocumentFragment();
						var __destructors = [];
						@content
						@destructors = __destructors;
						return __parent;
					}

					function @destroy() {
						for(var __i = 0; __i < @destructors.length; __i++) {
							@destructors[__i]();
						}
						@destructors = null;
					}
					__destructors.push(@destroy);
				});

				// Render the code
				code.push(template{
					__parent.appendChild(@nodes = @create());
				});

				// Code that updates the DOM as data changes
				updateCode.push(template{
					// The if-expression changed?
					if (@state != @(a.expr)) {
						@state = !@state;
						if (!@state) {
							@destroy();
						}
						@newnodes = @create();
						// Insert the new nodes instead of the old nodes
						@nodes[0].parentNode.insertBefore(@newnodes, @nodes[0]);
						for(var __i = 0; __i < @nodes.length; __i++) {
							@nodes[i].parentNode.removeChild(@nodes[__i]);
						}
						@nodes = @newnodes;
						@newnodes = null;
					} else {
						// See if any children need to update
						@updateContent
					}
				});
				break;
		}
	}
}

