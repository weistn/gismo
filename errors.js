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

function SyntaxError(message) {
    this.message = message;
}

SyntaxError.prototype.toString = function() {
    return this.message;
}

exports.ErrorType = ErrorType;
exports.Messages = Messages;
exports.SyntaxError = SyntaxError;
