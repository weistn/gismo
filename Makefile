export NODE_PATH=$NODE_PATH:./test

.PHONY: test lib

all: lib

test: lib
	./node_modules/.bin/mocha --reporter spec

lib:
	./bin/gismoc ./lib/template
	./bin/gismoc ./lib/metaprogramming
	./bin/gismoc ./lib/build
	./bin/gismoc ./lib/grammar
	./bin/gismoc ./lib/class
	./bin/gismoc ./lib/transform
	./bin/gismoc ./lib/xml/dom
	./bin/gismoc ./lib/markdown/lang
	./bin/gismoc ./lib/template/xml/parser
	./bin/gismoc ./lib/template/xml
	./bin/gismoc ./lib/template/dom
	./bin/gismoc ./lib/doc

libdep:
	./bin/gismoc --dependencies --graphviz ./lib/template
	./bin/gismoc --dependencies --graphviz ./lib/metaprogramming
	./bin/gismoc --dependencies --graphviz ./lib/grammar
	./bin/gismoc --dependencies --graphviz ./lib/class
	./bin/gismoc --dependencies --graphviz ./lib/transform
	./bin/gismoc --dependencies --graphviz ./lib/xml/dom
	./bin/gismoc --dependencies --graphviz ./lib/markdown/lang
	./bin/gismoc --dependencies --graphviz ./lib/template/xml/parser
	./bin/gismoc --dependencies --graphviz ./lib/template/xml
	./bin/gismoc --dependencies --graphviz ./lib/template/dom
	./bin/gismoc --dependencies --graphviz ./lib/build
	./bin/gismoc --dependencies --graphviz ./lib/doc

clean:
	./bin/gismoc clean -r lib