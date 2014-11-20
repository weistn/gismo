export NODE_PATH=$NODE_PATH:./test

.PHONY: test lib

all: lib

test: lib
	./node_modules/.bin/mocha --reporter spec

lib:
	./bin/gismo compile -r lib

libdep:
	./bin/gismo compile -r --dependencies --graphviz lib

clean:
	./bin/gismo clean -r lib