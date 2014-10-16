export NODE_PATH=$NODE_PATH:./test

.PHONY: test lib

all: lib

test: lib
	./node_modules/.bin/mocha --reporter spec

lib:
	./bin/gismoc ./lib/template
	./bin/gismoc ./lib/metaprogramming
	./bin/gismoc ./lib/grammar
	./bin/gismoc ./lib/class
	./bin/gismoc ./lib/transform
	./bin/gismoc ./lib/markdown/lang
	./bin/gismoc ./lib/template/xml/parser
	./bin/gismoc ./lib/template/xml
	./bin/gismoc ./lib/template/dom
	./bin/gismoc ./lib/build
	./bin/gismoc ./lib/doc

libdep:
	./bin/gismoc --dependencies --graphviz ./lib/template
	./bin/gismoc --dependencies --graphviz ./lib/metaprogramming
	./bin/gismoc --dependencies --graphviz ./lib/grammar
	./bin/gismoc --dependencies --graphviz ./lib/class
	./bin/gismoc --dependencies --graphviz ./lib/transform
	./bin/gismoc --dependencies --graphviz ./lib/markdown/lang
	./bin/gismoc --dependencies --graphviz ./lib/template/xml/parser
	./bin/gismoc --dependencies --graphviz ./lib/template/xml
	./bin/gismoc --dependencies --graphviz ./lib/template/dom
	./bin/gismoc --dependencies --graphviz ./lib/build
	./bin/gismoc --dependencies --graphviz ./lib/doc

clean:
	rm -f test/module1/main.js
	rm -f test/module1/main.js.map
	rm -f test/module1/_meta.js
	rm -f test/module1/_meta.js.map
	rm -f test/module2/main.js
	rm -f test/module2/main.js.map
	rm -f test/module2/_meta.js
	rm -f test/module2/_meta.js.map
	rm -f test/module3/main.js
	rm -f test/module3/main.js.map
	rm -f test/module3/_meta.js
	rm -f test/module3/_meta.js.map
	rm -f test/module4/main.js
	rm -f test/module4/main.js.map
	rm -f test/module4/_meta.js
	rm -f test/module4/_meta.js.map
	rm -f test/parser_test.js.out
	rm -f test/parser_test.js.map
	rm -f lib/template/main.js
	rm -f lib/template/main.js.map
	rm -f lib/template/_meta.js
	rm -f lib/template/_meta.js.map
	rm -f lib/template/dependencies.json
	rm -f lib/template/dependencies.dot
	rm -f lib/metaprogramming/main.js
	rm -f lib/metaprogramming/main.js.map
	rm -f lib/metaprogramming/_meta.js
	rm -f lib/metaprogramming/_meta.js.map
	rm -f lib/metaprogramming/dependencies.json
	rm -f lib/metaprogramming/dependencies.dot
	rm -f lib/grammar/main.js
	rm -f lib/grammar/main.js.map
	rm -f lib/grammar/_meta.js
	rm -f lib/grammar/_meta.js.map
	rm -f lib/grammar/dependencies.json
	rm -f lib/grammar/dependencies.dot
	rm -f lib/class/main.js
	rm -f lib/class/main.js.map
	rm -f lib/class/_meta.js
	rm -f lib/class/_meta.js.map
	rm -f lib/class/dependencies.json
	rm -f lib/class/dependencies.dot
	rm -f lib/transform/main.js
	rm -f lib/transform/main.js.map
	rm -f lib/transform/_meta.js
	rm -f lib/transform/_meta.js.map
	rm -f lib/transform/dependencies.json
	rm -f lib/transform/dependencies.dot
	rm -f lib/markdown/lang/main.js
	rm -f lib/markdown/lang/main.js.map
	rm -f lib/markdown/lang/_meta.js
	rm -f lib/markdown/lang/_meta.js.map
	rm -f lib/markdown/lang/dependencies.json
	rm -f lib/markdown/lang/dependencies.dot
	rm -f lib/template/xml/main.js
	rm -f lib/template/xml/main.js.map
	rm -f lib/template/xml/_meta.js
	rm -f lib/template/xml/_meta.js.map
	rm -f lib/template/xml/dependencies.json
	rm -f lib/template/xml/dependencies.dot
	rm -f lib/template/xml/test/.test1.js
	rm -f lib/template/xml/test/.test1.js.map
	rm -f lib/template/xml/parser/main.js
	rm -f lib/template/xml/parser/main.js.map
	rm -f lib/template/xml/parser/_meta.js
	rm -f lib/template/xml/parser/_meta.js.map
	rm -f lib/template/xml/parser/dependencies.json
	rm -f lib/template/xml/parser/dependencies.dot
	rm -f lib/template/dom/weblib.js
	rm -f lib/template/dom/weblib.js.map
	rm -f lib/template/dom/main.js
	rm -f lib/template/dom/main.js.map
	rm -f lib/template/dom/_meta.js
	rm -f lib/template/dom/_meta.js.map
	rm -f lib/template/dom/dependencies.json
	rm -f lib/template/dom/resources.json
	rm -f lib/template/dom/dependencies.dot
	rm -f lib/template/dom/test/.test1.js
	rm -f lib/template/dom/test/.test1.js.map
	rm -f lib/build/main.js
	rm -f lib/build/main.js.map
	rm -f lib/build/weblib.js
	rm -f lib/build/weblib.js.map
	rm -f lib/build/_meta.js
	rm -f lib/build/_meta.js.map
