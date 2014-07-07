export NODE_PATH=./test

.PHONY: test lib

test: lib
	./node_modules/.bin/mocha --reporter spec

lib:
	./bin/gismoc ./lib/template
	./bin/gismoc ./lib/metaprogramming

clean:
	rm -f test/module1/main.js
	rm -f test/module1/main.js.map
	rm -f test/module1/_meta.js
	rm -f test/module1/_meta.js.map
	rm -f test/module2/main.js
	rm -f test/module2/main.js.map
	rm -f test/module2/_meta.js
	rm -f test/module2/_meta.js.map
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
