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
		var __instance = Object.create(@(identifier parser.importAlias(module)).Widget.prototype);

		__instance.getFragment = function() {
			var __f = document.createDocumentFragment();
			for(var __i = 0; __i < __children.length; __i++) {
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
			__children.push(__parent.children[__i]);
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
				code.push(template{ __parent.appendChild(__node); });
				if (a.attributes) {
					for(var j = 0; j < a.attributes.length; j++) {
						var attr = a.attributes[j];
						if (attr.value.type === "Code") {
							var node = identifier "__node_" + (counter).toString();
							var state = identifier "__state_" + (counter).toString();
							var newstate = identifier "__newstate_" + (counter++).toString();
							code.push(template{ var @state = @(attr.value.expr).toString(), @node = __node, @newstate});
							code.push(template{ __node.setAttribute(@(literal attr.name.name), @state); });
							updateCode.push.apply(updateCode, template{
								@newstate = @(attr.value.expr).toString();
								if (@newstate !== @state) {
									@state = @newstate;
									@node.setAttribute(@(literal attr.name.name), @state);	
								}
							});
						} else {
							code.push(template{ __node.setAttribute(@(literal attr.name.name), @(literal attr.value.value)); });
						}
					}
				}
				if (a.content) {
					code.push(template{ __parent = __node; })
					generateContent(code, updateCode, a.content);					
					code.push(template{ __parent = __parent.parentNode; })
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
				var create = identifier "__create_" + (counter).toString();
				var nodes = identifier "__nodes_" + (counter).toString();
				var state = identifier "__state_" + (counter).toString();
				var newstate = identifier "__newstate_" + (counter++).toString();

				code.push.apply(code, template{
					var @state = @(a.expr), @nodes, @newstate;
					function @create() {
						__node = @(identifier parser.importAlias(module)).objectToNode(document, @state);
						if (__node.nodeType === 11) {
							// The expression resulted in a fragment. Remember all nodes inside
							@nodes = [];
							for(var __i = 0; __i < __node.children.length; __i++) {
								@nodes.push(__node.children[__i]);
							}
						} else {
							@nodes = [__node];
						}
						return __node;
					}
					__parent.appendChild(@create());
				});

				updateCode.push.apply(updateCode, template{
					@newstate = @(a.expr);
					if (@newstate !== @state) {
						// If the previous value and the new value are strings
						if ((typeof @newstate === "string" || typeof @newstate === "number" || typeof @newstate === "boolean") &&
							(typeof @state === "string" || typeof @state === "number" || typeof @state === "boolean")) {
							@state = @newstate;
							@nodes[0].data = @state.toString();
						} else {
							@state = @newstate;
							var __before = null;
							// Remove the old nodes

							// Insert the new nodes
							__node = @create();						
						}
					}
				});

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
				counter++;
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
								__parent.appendChild(@create(__item, @arrname[__i]));
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
						var __oldcomment = @comment;
						// Remove the old nodes
						for(var __i = 0; __i < @items.length; __i++) {
							var __item = @items[__i];
							for(var __j = 0; __j < __item.nodes.length; __j++) {
								__oldcomment.parentNode.removeChild(__item.nodes[__j]);
							}
						}
						@destroyAll();
						@arrname = @newarrname;
						var __newnodes = @createAll();
						// Insert the new nodes instead of the old comment
						__oldcomment.parentNode.insertBefore(__newnodes, __oldcomment);
						__oldcomment.parentNode.removeChild(__oldcomment);
						__newnodes = null;
					} else {
						if (@arrname.changes) {
							// Handle removals or insertions
							var __pos = 0;
							for(var __i = 0; __i < @arrname.changes.length; __i++) {
								var __change = @arrname.changes[__i];
								switch(__change.type) {
									case "ins":
										var __before = null;
										for(var __k = __pos; __k < @items.length; __k++) {
											if (@items[__k].nodes.length > 0) {
												__before = @items[__k].nodes[0];
												break;
											}
										}
										for(var __j = 0; __j < __change.length; __j++) {
											var __item = {};
											@comment.parentNode.insertBefore(@create(__item, @arrname[__pos + __j]), __before);
											@items.splice(__pos + __j, 0, __item);
										}
										__pos += __change.length;
										break;
									case "skip":
										for(var __j = 0; __j < __change.length; __j++) {
											@items[__j].update();
										}
										__pos += __change.length;
										break;
									case "del":
										// Remove the old nodes
										for(var __k = __pos; __k < __pos + __change.length; __k++) {
											var __item = @items[__k];
											for(var __j = 0; __j < __item.nodes.length; __j++) {
												@comment.parentNode.removeChild(__item.nodes[__j]);
											}
											@destroy(__item);
										}
										@items.splice(__pos, __change.length);
										break;
								}
							}
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
				var oldnodes = identifier "__oldnodes_" + counter.toString();
				var newnodes = identifier "__newnodes_" + counter.toString();
				var state = identifier "__state_" + (counter++).toString();
				code.push(template{ var @state = !!@(a.expr), @nodes, @newnodes, @oldnodes, @destructors; });

				// Process the content inside th if-clause
				var content = [];
				var updateContent = [];
				generateContent(content, updateContent, a.content);

				// Code to create and destroy the content
				code.push.apply(code, template{
					function @create() {
						if (!@state) {
							@nodes = [document.createComment("placeholder")];
							return @nodes[0];
						}
						var __parent = document.createDocumentFragment();
						var __destructors = [];
						@content
						@destructors = __destructors;
						@nodes = [];
						for(var __i = 0; __i < __parent.children.length; __i++) {
							@nodes.push(__parent.children[__i]);
						}
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
					__parent.appendChild(@create());
				});

				// Code that updates the DOM as data changes
				updateCode.push(template{
					// The if-expression changed?
					if (@state !== !!@(a.expr)) {
						@state = !@state;
						@oldnodes = @nodes;
						if (!@state) {
							@destroy();
						}
						@newnodes = @create();
						// Insert the new nodes instead of the old nodes
						@oldnodes[0].parentNode.insertBefore(@newnodes, @oldnodes[0]);
						for(var __i = 0; __i < @oldnodes.length; __i++) {
							@oldnodes[__i].parentNode.removeChild(@oldnodes[__i]);
						}
						@newnodes = null;
						@oldnodes = null;
					} else {
						// See if any children need to update
						@updateContent
					}
				});
				break;
		}
	}
}

