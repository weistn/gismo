var ErrorType = {
    SyntaxError: "Syntax Error",
    CompilerErrror: "Compiler Error"
};

// Error messages should be identical to V8.
var Messages = {
    UnexpectedToken:  'Unexpected token %0',
    UnexpectedNumber:  'Unexpected number',
    UnexpectedString:  'Unexpected string',
    UnexpectedIdentifier:  'Unexpected identifier',
    UnexpectedReserved:  'Unexpected reserved word',
    UnexpectedEOS:  'Unexpected end of input',
    NewlineAfterThrow:  'Illegal newline after throw',
    InvalidRegExp: 'Invalid regular expression',
    UnterminatedRegExp:  'Invalid regular expression: missing /',
    InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
    InvalidLHSInForIn:  'Invalid left-hand side in for-in',
    MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
    NoCatchOrFinally:  'Missing catch or finally after try',
    UnknownLabel: 'Undefined label \'%0\'',
    Redeclaration: '%0 \'%1\' has already been declared',
    IllegalContinue: 'Illegal continue statement',
    IllegalBreak: 'Illegal break statement',
    IllegalReturn: 'Illegal return statement',
    AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
    AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
    ImportFailed: 'Failed to import module %0: %1',
    CannotExport: 'Statement cannot be used in conjunction with export'
};

// Thrown when parsing failes
function SyntaxError(message) {
    this.message = message;
}

SyntaxError.prototype.valueOf = function() {
    return this.message;
};

SyntaxError.prototype.toString = function() {
    return this.message;
};

// Thrown when importing a meta module raises a runtime error
function CompilerError(message) {
    this.message = message;
}

CompilerError.prototype.valueOf = function() {
    return this.message;
};

CompilerError.prototype.toString = function() {
    return this.message;
};

function parseStackTrace(str) {
    var lines = str.split('\n');
    var message = lines[0];
    var stack = [];
    for(var i = 1; i < lines.length; i++) {
        var line = lines[i].trim().split(' ');
        if (line.length == 2) {
            line[2] = line[1];
            line[1] = "";
        }
        var tmp = line[2].slice(1, line[2].length - 1).split(':');
        var loc = {
            filename: tmp[0],
            lineNumber: parseInt(tmp[1]),
            column: parseInt(tmp[2])
        }
        stack.push({function: line[1], loc: loc});
    }
    return {message: message, stack: stack}
};

exports.ErrorType = ErrorType;
exports.Messages = Messages;
exports.SyntaxError = SyntaxError;
exports.CompilerError = CompilerError;
exports.parseStackTrace = parseStackTrace;
