import "gismo/metaprogramming/codegen"
import "gismo/metaprogramming/keywords"
import "gismo/template/xml/parser" as xmlparser

var counter = 0;

export operator domTemplate {
	// Parse parameters
	var args = [];
	parser.tokenizer.expect("(");
	var arg = parser.tokenizer.presumeIdentifier(true);
	while(arg) {
		args.push(arg.value);
		if (!parser.tokenizer.presume(",", true)) {
			break;
		}
		arg = parser.tokenizer.expectIdentifier();
	}
	parser.tokenizer.expect(")");

	parser.tokenizer.expect("{");
	var ast = xmlparser.parseFragment(parser);
	parser.tokenizer.expect("}");

	if (ast === null) {
		ast = [];
	}

	var updateCode = [];
	var createCode = [];
	counter = 0;
	generateContent(createCode, updateCode, ast);

	var loadParameters = [];
	for(var i = 0; i < args.length; i++) {
		loadParameters.push(template{ var @(identifier args[i]) = this.__arguments[@i]; });
	}

	var code = template{
		var widget_update = function(@args) {
			var $data, __newstate;
			@updateCode
		};

		var widget_create = function() {
			// Load all stored parameters in local variables
			@loadParameters

			var __destructors = [];
			var __parent = document.createDocumentFragment(), __node, $data;
			@createCode
			this.__destructors = __destructors;

			// TODO: Move to base class
			for(var __i = 0; __i < __parent.childNodes.length; __i++ ) {
				this.__children.push(__parent.childNodes[__i]);
			}
			if (this.__children.length === 0) {
				var placeholder = document.createComment("placeholder");
				__parent.appendChild(placeholder);
				this.__children = [placeholder];
			}
			return __parent;
		};

		var widget_destroy = function() {
			// TODO: Move to base class
			this.__children = null;
			for(var __i = 0; __i < this.__destructors.length; __i++) {
				this.__destructors[__i]();
			}
			this.__destructors = null;
		};

		// ctor accepts a variable list of parameters.
		// The update function expects exactly the same parameters.
		function ctor() {
			// TODO: Move to base class
			this.__children = [];
			this.__destructors = null;
			this.__arguments = arguments;
			this.constructor = ctor;
		}

		ctor.prototype = Object.create(@(identifier parser.importAlias(module)).Widget.prototype);
		ctor.prototype.create = widget_create;
		ctor.prototype.update = widget_update;
		ctor.prototype.destroy = widget_destroy;

		return ctor;
	};

	var params = [];
	return template((function(@params){@code})());
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
							if (attr.name.name === "style" && attr.value.expr.type === "ObjectExpression") {
								for(var k = 0; k < attr.value.expr.properties.length; k++) {
									var prop = attr.value.expr.properties[k];
									var name = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
									var node = template(this.@(identifier "__node_" + (counter).toString()));
									var state = template(this.@(identifier "__state_" + (counter).toString()));
									counter++;
									code.push(template{ @state = @(prop.value).toString(); });
									code.push(template{ @node = __node; });
									code.push(template{ __node.style.@(identifier name) = @state; });
									updateCode.push.apply(updateCode, template{
										__newstate = @(prop.value).toString();
										if (__newstate !== @state) {
											@state = __newstate;
											@node.style.@(identifier name) = @state;	
										}
									});									
								}
							} else if (attr.name.name === "class" && attr.value.expr.type === "ObjectExpression") {
								for(var k = 0; k < attr.value.expr.properties.length; k++) {
									var prop = attr.value.expr.properties[k];
									var name = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
									var node = template(this.@(identifier "__node_" + (counter).toString()));
									var state = template(this.@(identifier "__state_" + (counter).toString()));
									counter++;
									code.push(template{ @state = !!@(prop.value); });
									code.push(template{ @node = __node; });
									code.push(template{ if (@state) { @(identifier parser.importAlias(module)).__addClass(__node, @name); } });
									updateCode.push.apply(updateCode, template{
										__newstate = !!@(prop.value);
										if (__newstate !== @state) {
											@state = __newstate;
											if (@state) {
												@(identifier parser.importAlias(module)).__addClass(@node, @name);
											} else {
												@(identifier parser.importAlias(module)).__removeClass(@node, @name);
											}
										}
									});									
								}
							} else {
								var node = template(this.@(identifier "__node_" + (counter).toString()));
								var state = template(this.@(identifier "__state_" + (counter).toString()));
								counter++;
								code.push(template{ @state = @(attr.value.expr).toString(); });
								code.push(template{ @node = __node; });
								if ((a.nodeName.name === "textarea" || a.nodeName.name === "input") && (attr.name.name === "value" || attr.name.name === "checked")) {
									code.push(template{ __node.@(identifier attr.name.name) = @state; });
								} else {
									code.push(template{ __node.setAttribute(@(literal attr.name.name), @state); });
								}
								if ((a.nodeName.name === "textarea" || a.nodeName.name === "input") && attr.name.name === "value") {
									updateCode.push.apply(updateCode, template{
										__newstate = @(attr.value.expr).toString();
										if (__newstate !== @state) {
											@state = __newstate;
											@node.@(identifier attr.name.name) = @state;	
										}
									});
								} else if (a.nodeName.name === "input" && attr.name.name === "checked") {
									updateCode.push.apply(updateCode, template{
										__newstate = !!@(attr.value.expr);
										if (__newstate !== @state) {
											@state = __newstate;
											@node.@(identifier attr.name.name) = @state;	
										}
									});
								} else {
									updateCode.push.apply(updateCode, template{
										__newstate = @(attr.value.expr).toString();
										if (__newstate !== @state) {
											@state = __newstate;
											@node.setAttribute(@(literal attr.name.name), @state);	
										}
									});
								}
								if ((a.nodeName.name === "input" || a.nodeName.name === "textarea") && attr.name.name === "value" && attr.value.expr.type === "MemberExpression") {
									code.push(template{ var __self = this; });
									var eventName = "keyup";
									code.push(template{
										__node.addEventListener(@eventName, function() {
											@(identifier parser.importAlias(module)).__registerUpdater(__self, function() {
												if (@(attr.value.expr) != @node.@(identifier attr.name.name)) {
													@(attr.value.expr) = @node.@(identifier attr.name.name);
													return true;
												}
												return false;
											})
										});
									});									
								}
								else if (a.nodeName.name === "input" && attr.name.name === "checked" && attr.value.expr.type === "MemberExpression") {
									code.push(template{ var __self = this; });
									var eventName = "click";
									code.push(template{
										__node.addEventListener(@eventName, function() {
											@(identifier parser.importAlias(module)).__registerUpdater(__self, function() {
												if (@(attr.value.expr) != @node.@(identifier attr.name.name)) {
													@(attr.value.expr) = @node.@(identifier attr.name.name);
													return true;
												}
												return false;
											})
										});
									});									
								}
							}
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
				var create = template(this.@(identifier "__create_" + (counter).toString()));
				var nodes = template(this.@(identifier "__nodes_" + (counter).toString()));
				var state = template(this.@(identifier "__state_" + (counter).toString()));
				var destroy = template(this.@(identifier "__destroy_" + (counter).toString()));
				counter++;
				code.push.apply(code, template{
					@state = @(a.expr);
					
					@create = function() {
						var __node = @(identifier parser.importAlias(module)).objectToNode(document, @state);
						if (__node instanceof @(identifier parser.importAlias(module)).Widget) {
							__node = __node.create();
						}
						if (__node.nodeType === 11) {
							// The expression resulted in a fragment. Remember all nodes inside
							@nodes = [];
							for(var __i = 0; __i < __node.childNodes.length; __i++) {
								@nodes.push(__node.childNodes[__i]);
							}
						} else {
							@nodes = [__node];
						}
						return __node;
					}

					@destroy = function() {
						if (@state instanceof @(identifier parser.importAlias(module)).Widget) {
							@state.destroy();
						}
						@state = null;
						@nodes = null;
					};

					__parent.appendChild(@create());
					__destructors.push(@destroy);
				});

				updateCode.push.apply(updateCode, template{
					__newstate = @(a.expr);
					if (__newstate !== @state) {
						// If the previous value and the new value are strings
						if ((typeof __newstate === "string" || typeof __newstate === "number" || typeof __newstate === "boolean") &&
							(typeof @state === "string" || typeof @state === "number" || typeof @state === "boolean")) {
							@state = __newstate;
							@nodes[0].data = @state.toString();
						} else {
							__newstate = @(identifier parser.importAlias(module)).objectToNode(document, __newstate);
							if ((@state instanceof @(identifier parser.importAlias(module)).Widget) && (__newstate instanceof @(identifier parser.importAlias(module)).Widget) && @state.constructor === __newstate.constructor) {
								// Simply update the existing widget
								@state.update.apply(@state, __newstate.__arguments);
							} else {
								// Remove the old nodes
								var __before = @nodes[@nodes.length-1].nextSibling;
								var __parent = @nodes[0].parentNode;
								for(var __i = @nodes.length - 1; __i >= 0; __i--) {
									__parent.removeChild(@nodes[__i]);
								}
								@destroy();
								@state = __newstate;
								__parent.insertBefore(@create(), __before);
							}
						}
					}
				});

				break;
			case "Foreach":
				if (a.content.length === 0) {
					continue;
				}
				var arrname = template(this.@(identifier "__arr_" + (counter).toString()));
				var items = template(this.@(identifier "__items_" + (counter).toString()));
				var comment = template(this.@(identifier "__comment_" + (counter).toString()));
				var update = template(this.@(identifier "__update_" + counter.toString()));
				var create = template(this.@(identifier "__create_" + counter.toString()));
				var destroy = template(this.@(identifier "__destroy_" + counter.toString()));
				var createAll = template(this.@(identifier "__createAll_" + counter.toString()));
				var destroyAll = template(this.@(identifier "__destroyAll_" + counter.toString()));
				counter++;
				// Process the content inside th foreach-clause
				var content = [];
				var updateContent = [];
				generateContent(content, updateContent, a.content);

				// Code to create and destroy the content
				code.push.apply(code, template{
					@arrname = @(a.expr);

					@createAll = function() {
						var __parent = document.createDocumentFragment();
						// A placeholder in case the array is empty
						__parent.appendChild(@comment = document.createComment("placeholder"));
						@items = [];
						if (@arrname) {
							var __len = @arrname.length;
							for(var __i = 0; __i < __len; __i++) {
								var __item = {};
								__parent.appendChild(@create.call(__item, @arrname[__i], __i));
								@items.push(__item);
							}
						}
						return __parent;						
					}

					@destroyAll = function() {
						for(var __i = 0; __i < @items.length; __i++) {
							@destroy.call(@items[__i]);
						}
						@items = null;
						@comment = null;
						@arrname = null;
					}
					__destructors.push(@destroyAll);

					@create = function($data, $index) {
						var __parent = document.createDocumentFragment();
						var __destructors = [];
						@content
						this.destructors = __destructors;
						this.nodes = [];
						this.$data = $data;
						for(var __i = 0; __i < __parent.childNodes.length; __i++) {
							this.nodes.push(__parent.childNodes[__i]);
						}
						return __parent;
					}

					@destroy = function() {
						for(var __i = 0; __i < this.destructors.length; __i++) {
							this.destructors[__i]();
						}
					}

					@update = function($index) {
						var $data = this.$data;
						@updateContent
					};

					__parent.appendChild(@createAll());
				});

				// Code that updates the DOM as data changes
				updateCode.push.apply(updateCode, template{
					// The foreach-expression changed? Then replace everything
					__newstate = @(a.expr);
					if (@arrname != __newstate) {
						var __oldcomment = @comment;
						// Remove the old nodes
						for(var __i = 0; __i < @items.length; __i++) {
							var __item = @items[__i];
							for(var __j = 0; __j < __item.nodes.length; __j++) {
								__oldcomment.parentNode.removeChild(__item.nodes[__j]);
							}
						}
						@destroyAll();
						@arrname = __newstate;
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
											@comment.parentNode.insertBefore(@create.call(__item, @arrname[__pos + __j], __pos + __j), __before);
											@items.splice(__pos + __j, 0, __item);
										}
										__pos += __change.length;
										break;
									case "skip":
										for(var __j = 0; __j < __change.length; __j++) {
											@update.call(@items[__pos + __j], __pos + __j);
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
											@destroy.call(__item);
										}
										@items.splice(__pos, __change.length);
										break;
								}
							}
							// Skip what remains
							if (__pos < @items.length) {
								for(var __j = __pos; __j < @items.length; __j++) {
									@update.call(@items[__j], __j);
								}								
							}
						} else {
							// No changes to the array itself. See if any item needs updating
							for (var __i = 0; __i < @items.length; __i++) {
								@update.call(@items[__i], __i);
							}
						}
					}
				});
				break;
			case "If":
				if (a.content.length === 0) {
					continue;
				}
				var create = template(this.@(identifier "__create_" + counter.toString()));
				var destroy = template(this.@(identifier "__destroy_" + counter.toString()));
				var destructors = template(this.@(identifier "__destructors_" + counter.toString()));
				var nodes = template(this.@(identifier "__nodes_" + counter.toString()));
				var oldnodes = identifier "__oldnodes_" + counter.toString();
				var newnodes = identifier "__newnodes_" + counter.toString();
				var state = template(this.@(identifier "__state_" + (counter).toString()));
				counter++
				code.push(template{ var @newnodes, @oldnodes; });

				// Process the content inside th if-clause
				var content = [];
				var updateContent = [];
				generateContent(content, updateContent, a.content);

				// Code to create and destroy the content
				code.push.apply(code, template{
					@state = !!@(a.expr);
					@create = function() {
						if (!@state) {
							@nodes = [document.createComment("placeholder")];
							return @nodes[0];
						}
						var __parent = document.createDocumentFragment();
						var __destructors = [];
						@content
						@destructors = __destructors;
						@nodes = [];
						for(var __i = 0; __i < __parent.childNodes.length; __i++) {
							@nodes.push(__parent.childNodes[__i]);
						}
						return __parent;
					}

					@destroy = function() {
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

