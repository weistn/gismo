export NODE_PATH=/Users/weis/Projects/mydummy/test

.PHONY: test

test:
	./node_modules/.bin/mocha --reporter spec

