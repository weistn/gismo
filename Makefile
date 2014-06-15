export NODE_PATH=./test

.PHONY: test

test:
	./node_modules/.bin/mocha --reporter spec

