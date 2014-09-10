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
	rm -f lib/metaprogramming/main.js
	rm -f lib/metaprogramming/main.js.map
	rm -f lib/metaprogramming/_meta.js
	rm -f lib/metaprogramming/_meta.js.map
	rm -f lib/grammar/main.js
	rm -f lib/grammar/main.js.map
	rm -f lib/grammar/_meta.js
	rm -f lib/grammar/_meta.js.map
	rm -f lib/class/main.js
	rm -f lib/class/main.js.map
	rm -f lib/class/_meta.js
	rm -f lib/class/_meta.js.map
	rm -f lib/transform/main.js
	rm -f lib/transform/main.js.map
	rm -f lib/transform/_meta.js
	rm -f lib/transform/_meta.js.map
	rm -f lib/markdown/lang/main.js
	rm -f lib/markdown/lang/main.js.map
	rm -f lib/markdown/lang/_meta.js
	rm -f lib/markdown/lang/_meta.js.map
