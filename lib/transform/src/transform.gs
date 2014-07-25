export function traverse(ast, callback, parents) {
    if (parents === undefined) {
        parents = [];
    }
    ast = invokeCallback(ast, parents, callback);
    for(var key in ast) {
        var v = ast[key];
        if (typeof v === "object") {
            if (v === null) {
                // Do nothing by intention
            } else if (v.length !== undefined) {
                for(var i = 0; i < v.length; i++) {
                    if (typeof v[i] !== "object") {
                        continue;
                    }
                    parents.push({ast: ast, key: key, index: i});
                    traverse(v[i], callback, parents);
                    parents.pop();
                }
            } else {
                if (typeof v === "object") {
                    parents.push({ast: ast, key: key});
                    traverse(v, callback, parents);
                    parents.pop();
                }
            }
        }
    }
    return ast;
}

function invokeCallback(ast, parents, callback) {
    var result = callback.call(ast, parents);
    if (result === ast) {
        return ast;
    }
    if (parents.length > 0) {
        var p = parents[parents.length - 1];
        if (p.index === undefined) {
            p.ast[p.key] = result;
        } else {
            if (result === null) {
                p.ast[p.key].splice(p.index, 1);
            } else if (typeof result === "object" && result.length !== undefined) {
                Array.prototype.splice.apply(p.ast[p.key], [p.index, 1].concat(result));
            } else {
                p.ast[p.key][p.index] = result;
            }
        }
    }
}
