export NODE_PATH=./test

.PHONY: test

test:
	./node_modules/.bin/mocha --reporter spec

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
