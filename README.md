# Gismo

Gismo is an extensible JavaScript transpiler (like CoffeeScript).
Thus it reads Gismo source files and generated JavaScript files.

Gismo's main feature is its extensible syntax.
Each Gismo module can contain new syntax, e.g. new operators or entirely new constructs like `class`, `foreach` or `statemachine`.
Thus, when importing a module, you import code and (optionally) syntax extensions.

Let's imagine a simple example module called `debugme`. It contains a new keyword `debug`.
It can be used like this (when stored in a file called `demo.gs`):

```javascript
import "debugme"

debug "I am here"
```

Let's compile this to JavaScript and run it

```
> gismo demo.gs

demo.gs:3 I am here
```

Obviously `debug` has become a statement of the language. Gismo does not know this statement, but the `debugme` module extends the language *as it is being imported*.
This is important. The language parser learns new tricks while importing modules. This is unlike other language extensions where new syntactic constructs are always available.
In gismo we import new syntax only when we need it.

The following code implements the new `debug` statement:

```javascript
import "gismo/metaprogramming"
import "gismo/template"

statement debug {
	var expr = parser.parseExpression();
	parser.parseEndOfStatement();
	return template{ console.log(@(loc.filename) + ": " + @(loc.lineNumber), @expr) }
}
```

This illustrates that it is possibel to register a hook in the Gismo parser and its code generation. `statement debug` registers debug as a keyword that starts a statement.
The code block that follows uses the Gismo parser to parse the statement and to generate code for the statement.

The code resulting from compilation is:

```javascript
var debugme = require('debugme');
console.log("debug.gs" + ": " + 3, "I am here");
```

Finally, the two imports in the `debugme` two modules need explanation: `gismo/metaprogramming` and `gismo/template`.
These are themselves syntax extensions that implement `statement` and `template` with a convenient syntax.
Thus, one can write syntax extensions that help writing syntax extensions.
For example, there is `gismo/grammar` that provides new syntax to define a LL1 grammar in Gismo. 
Therefore, Gismo is an excellent tool for meta-programmers.

### Source-Maps

Gismo automatically produces source maps and rewrites error messages.
For example, we can mess up `demo.gs` like this:

```javascript
import "debugme"

debug I am a syntax error
```

When this is compiled to JS the compiler detects the syntax error and writes

```
debug.gs:3 Unexpected token am
```

Now we mess up in such a way that the code procudes a runtime error:

```javascript
import "debugme"

var foo = 12;
debug foo+bar
```

When executed we see

```
ReferenceError: bar is not defined
	at (demo.gs:3:11)
```

Although node reported an error at a different location somewhere in `.debug.js`, source maps allow Gismo to rewrite the error message and point to the real source of the problem.
Using source-maps the same magic works inside modern browsers like Chrome.

### JavaScript compatibility

Gismo generates standard ECMA script that can be executed by node or inside browsers.
*Currently every Gismo module becomes a node module. Support for browsers is missing yet*.
Furthermore, you can import any JavaScript library or node module in Gismo.

Without any imported syntax, Gismo is almost exactly JavaScript with `import` and `export` as the only built-in extensions.

# Why should I care

Whenever I write a complex framework I wonder whether code using the framework could be improved with special syntax.
So instead of writing

```javascript
var s = new Statemachine('s').
	addState('foo').
	addState('bar').
	addTransition('foo', 'bar', function() {
		console.log("Hello");
	})
```

I would rather write

```javascript
statemachine s {
	state foo;
	state bar;
	foo -> bar { console.log("Hello");
}
```

However, crafting a completely new language just for this is not worth the pain.
Hence, I came to the conclusion that each framework should be able to inject new syntax into an existing language, but only in places where the framework is really used.
Since I am writing JavaScript for node and browsers quite often, I decided to build Gismo on top of JavaScript.
Without any imported syntax extensions Gismo matches JavaScript exactly (except for 'import' and 'export').

# Syntax extensions considered harmful

Languages with a complex syntax are considered to be difficult to learn.
If each module can import new syntactic structures, Gismo should become terribly difficult in the long run, right?

Assume someone is reading either

```javascript
var s = new Statemachine('s').
	addState('foo').
	addState('bar').
	addTransition('foo', 'bar', function() {
		console.log("Hello");
	})
```

or

```javascript
statemachine s {
	state foo;
	state bar;
	foo -> bar { console.log("Hello") };
}
```

Which of both is easier to understand? Even though the syntax of the second example might seem slightly alien, its meaning is easy to grasp.
Software is read frequently, but written only once.
Hence, the idea of Gismo is to provide syntax that results in readable code.

To understand some code, you have to understand the syntax and the behavior of the code, including the behavior of imported framework code.
That means you either have to learn how to use the function `Statemachine` and that it returns an object that offers member functions `addState` and `addTransition`
and that a function has to be passed to 'addTransition' that is being called when the transition fires.
Or you learn a new syntax for expressing the same thing. I believe the learning curve for writing the code is the same, but Gismo code is more readable.

Of course one can always showcase extreme counter examples where almost every possible word has either become a statement or operator, or both.
But the same holds for all programming paradigms: No language can safe a developer from writing unreadable code.
However, a language should make it possible to write readable code easily.

The advantage of gismo is that you import only those syntactic constructs that you need.
Thus, if thousands of modules (each with its own funny syntax extensions) exist, it is no problem, unless you try to import them all in the same file.
But usually the number of frameworks used by one project is very small and hence every Gismo file will in practice only import a very limited set of syntax extensions.

# Project Status

Gismo is currently in alpha state.

The transpiler, its module system and its syntax extension works. But there are for sure some bugs left.
To become beta, it is lacking documentation and some useful modules, for example `class` or `statemachine` to show off what Gismo can do.




