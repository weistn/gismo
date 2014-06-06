// Lexer copied from esprima, which is BSD licensed.
// https://github.com/ariya/esprima
// Modified to fit our special needs.

/*
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var Token,
    Messages,
    Regex;

Token = {
    BooleanLiteral: "Boolean",
    EOF: "<end>",
    Identifier: "Identifier",
    Keyword: "Keyword",
    NullLiteral: "Null",
    NumericLiteral: "Numeric",
    Punctuator: "Punctuator",
    StringLiteral: "String",
    RegularExpression: "RegularExpression"
};

// Error messages should be identical to V8.
Messages = {
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
};

// See also tools/generate-unicode-regex.py.
Regex = {
    NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
    NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
};

function Tokenizer(source) {
    // The source string
    this.source = source;
    // Position inside the this.source string
    this.index = 0;
    // Current line number
    this.lineNumber = (this.source.length > 0) ? 1 : 0;
    // 'index' of the line start
    this.lineStart = 0;
    // Length of the source string
    this.length = this.source.length;
    this.lookahead = null;
    this.lookback = null;

    this.punctuators = {further: {}};
    this.registerESPunctuators();
    this.keywords = [];
    this.registerESKeywords();
}

// Ensure the condition is true, otherwise throw an error.
// This is only to have a better contract semantic, i.e. another safety net
// to catch a logic error. The condition shall be fulfilled in normal case.
// Do NOT use this to enforce a certain condition on any user input.

function assert(condition, message) {
    /* istanbul ignore if */
    if (!condition) {
        throw new Error('ASSERT: ' + message);
    }
}

function isDecimalDigit(ch) {
    return (ch >= 48 && ch <= 57);   // 0..9
}

function isHexDigit(ch) {
    return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
}

function isOctalDigit(ch) {
    return '01234567'.indexOf(ch) >= 0;
}


// 7.2 White Space

function isWhiteSpace(ch) {
    return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
        (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
}

// 7.3 Line Terminators

function isLineTerminator(ch) {
    return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
}

// 7.6 Identifier Names and Identifiers

function isIdentifierStart(ch) {
    return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
        (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
        (ch >= 0x61 && ch <= 0x7A) ||         // a..z
        (ch === 0x5C) ||                      // \ (backslash)
        ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
}

function isIdentifierPart(ch) {
    return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
        (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
        (ch >= 0x61 && ch <= 0x7A) ||         // a..z
        (ch >= 0x30 && ch <= 0x39) ||         // 0..9
        (ch === 0x5C) ||                      // \ (backslash)
        ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
}

// 7.6.1.1 Keywords

Tokenizer.prototype.registerESKeywords = function() {
    this.keywords = ["if", "in", "do", "var", "for", "new", "try", "let",
        "yield", "this", "else", "case", "void", "with",
        "while", "break", "catch", "throw", "const",
        "return", "typeof", "delete", "switch",
        "default", "finally", "function", "continue", "debugger", "instanceof"];
}

Tokenizer.prototype.registerKeyword = function(str) {
    if (this.keywords.indexOf(str) !== -1) {
        throw "LexerError: Keyword " + str + " is already registered";
    }
    this.keywords.push(str);
}

Tokenizer.prototype.isKeyword = function(id) {
    return this.keywords.indexOf(id) !== -1;
}

// 7.4 Comments

Tokenizer.prototype.skipSingleLineComment = function(offset) {
    var ch;

    while (this.index < this.length) {
        ch = this.source.charCodeAt(this.index);
        ++this.index;
        if (isLineTerminator(ch)) {
            if (ch === 13 && this.source.charCodeAt(this.index) === 10) {
                ++this.index;
            }
            ++this.lineNumber;
            this.lineStart = this.index;
            return;
        }
    }
}

Tokenizer.prototype.skipMultiLineComment = function() {
    var ch;

    while (this.index < this.length) {
        ch = this.source.charCodeAt(this.index);
        if (isLineTerminator(ch)) {
            if (ch === 0x0D && this.source.charCodeAt(this.index + 1) === 0x0A) {
                ++this.index;
            }
            ++this.lineNumber;
            ++this.index;
            this.lineStart = this.index;
            if (this.index >= this.length) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        } else if (ch === 0x2A) {
            // Block comment ends with '*/'.
            if (this.source.charCodeAt(this.index + 1) === 0x2F) {
                ++this.index;
                ++this.index;
                return;
            }
            ++this.index;
        } else {
            ++this.index;
        }
    }

    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
}

Tokenizer.prototype.skipComment = function() {
    var ch;

    while (this.index < this.length) {
        ch = this.source.charCodeAt(this.index);

        if (isWhiteSpace(ch)) {
            ++this.index;
        } else if (isLineTerminator(ch)) {
            ++this.index;
            if (ch === 0x0D && this.source.charCodeAt(this.index) === 0x0A) {
                ++this.index;
            }
            ++this.lineNumber;
            this.lineStart = this.index;
        } else if (ch === 0x2F) { // U+002F is '/'
            ch = this.source.charCodeAt(this.index + 1);
            if (ch === 0x2F) {
                ++this.index;
                ++this.index;
                this.skipSingleLineComment(2);
            } else if (ch === 0x2A) {  // U+002A is '*'
                ++this.index;
                ++this.index;
                this.skipMultiLineComment();
            } else {
                break;
            }
        } else {
            break;
        }
    }
}

Tokenizer.prototype.scanHexEscape = function(prefix) {
    var i, len, ch, code = 0;

    len = (prefix === 'u') ? 4 : 2;
    for (i = 0; i < len; ++i) {
        if (this.index < this.length && isHexDigit(this.source[this.index])) {
            ch = this.source[this.index++];
            code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
        } else {
            return '';
        }
    }
    return String.fromCharCode(code);
}

Tokenizer.prototype.getEscapedIdentifier = function() {
    var ch, id;

    ch = this.source.charCodeAt(this.index++);
    id = String.fromCharCode(ch);

    // '\u' (U+005C, U+0075) denotes an escaped character.
    if (ch === 0x5C) {
        if (this.source.charCodeAt(this.index) !== 0x75) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        ++this.index;
        ch = this.scanHexEscape('u');
        if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        id = ch;
    }

    while (this.index < this.length) {
        ch = this.source.charCodeAt(this.index);
        if (!isIdentifierPart(ch)) {
            break;
        }
        ++this.index;
        id += String.fromCharCode(ch);

        // '\u' (U+005C, U+0075) denotes an escaped character.
        if (ch === 0x5C) {
            id = id.substr(0, id.length - 1);
            if (this.source.charCodeAt(this.index) !== 0x75) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            ++this.index;
            ch = this.scanHexEscape('u');
            if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            id += ch;
        }
    }

    return id;
}

Tokenizer.prototype.getIdentifier = function() {
    var start, ch;

    start = this.index++;
    while (this.index < this.length) {
        ch = this.source.charCodeAt(this.index);
        if (ch === 0x5C) {
            // Blackslash (U+005C) marks Unicode escape sequence.
            this.index = start;
            return this.getEscapedIdentifier();
        }
        if (isIdentifierPart(ch)) {
            ++this.index;
        } else {
            break;
        }
    }

    return this.source.slice(start, this.index);
}

Tokenizer.prototype.scanIdentifier = function() {
    var start, id, type;

    start = this.index;

    // Backslash (U+005C) starts an escaped character.
    id = (this.source.charCodeAt(this.index) === 0x5C) ? this.getEscapedIdentifier() : this.getIdentifier();

    if (this.isKeyword(id)) {
        type = Token.Keyword;
    } else if (id === 'null') {
        type = Token.NullLiteral;
    } else if (id === 'true' || id === 'false') {
        type = Token.BooleanLiteral;
    } else {
        type = Token.Identifier;
    }

    return {
        type: type,
        value: id,
        lineNumber: this.lineNumber,
        lineStart: this.lineStart,
        start: start,
        end: this.index
    };
}


// 7.7 Punctuators

Tokenizer.prototype.registerPunctuator = function(str) {
    if (str == "") {
        throw "LexerError: Invalid punctuator";
    }
    var current = this.punctuators;
    for(var i = 0; i < str.length; i++) {
        var ch = str[i];
        var p = current.further[ch];
        if (p === undefined) {
            p = {
                further: {}
            };
            current.further[ch] = p;
        }
        current = p;
    }
    if (current.complete) {
        throw "LexerError: Punctuator " + str + " has already been registered";
    }
    current.complete = true;
}

Tokenizer.prototype.registerESPunctuators = function() {
    this.registerPunctuator(".");    
    this.registerPunctuator("(");
    this.registerPunctuator(")");
    this.registerPunctuator("[");
    this.registerPunctuator("]");
    this.registerPunctuator("{");
    this.registerPunctuator("}");
    this.registerPunctuator(",");
    this.registerPunctuator(";");
    this.registerPunctuator(":");
    this.registerPunctuator("?");
    this.registerPunctuator("~");
    this.registerPunctuator("<");
    this.registerPunctuator(">");
    this.registerPunctuator("+");
    this.registerPunctuator("-");
    this.registerPunctuator("*");
    this.registerPunctuator("%");
    this.registerPunctuator("&");
    this.registerPunctuator("|");
    this.registerPunctuator("&&");
    this.registerPunctuator("||");
    this.registerPunctuator("^");
    this.registerPunctuator("/");
    this.registerPunctuator("=");
    this.registerPunctuator("+=");
    this.registerPunctuator("-=");
    this.registerPunctuator("/=");
    this.registerPunctuator("<=");
    this.registerPunctuator(">=");
    this.registerPunctuator("^=");
    this.registerPunctuator("|=");
    this.registerPunctuator("&=");
    this.registerPunctuator("%=");
    this.registerPunctuator("*=");
    this.registerPunctuator("==");
    this.registerPunctuator("===");
    this.registerPunctuator("!");
    this.registerPunctuator("!=");
    this.registerPunctuator("!==");
    this.registerPunctuator("<<");
    this.registerPunctuator(">>");
    this.registerPunctuator("<<=");
    this.registerPunctuator(">>=");
    this.registerPunctuator(">>>");
    this.registerPunctuator(">>>=");
    this.registerPunctuator("=>");
    this.registerPunctuator("++");
    this.registerPunctuator("--");
}

Tokenizer.prototype.scanPunctuator = function() {
    var start = this.index;
    var current = this.punctuators;
    while(this.index < this.length) {
        var p = current.further[this.source[this.index]];
        if (p === undefined) {
            break;
        }
        this.index++;
        current = p;
    }
    if (this.index === start || !current.complete) {
        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }
    return {
        type: Token.Punctuator,
        value: this.source.substring(start, this.index),
        lineNumber: this.lineNumber,
        lineStart: this.lineStart,
        start: start,
        end: this.index
    };
}

// 7.8.3 Numeric Literals

Tokenizer.prototype.scanHexLiteral = function(start) {
    var number = '';

    while (this.index < this.length) {
        if (!isHexDigit(this.source[this.index])) {
            break;
        }
        number += this.source[this.index++];
    }

    if (number.length === 0) {
        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    if (isIdentifierStart(this.source.charCodeAt(this.index))) {
        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    return {
        type: Token.NumericLiteral,
        value: parseInt('0x' + number, 16),
        lineNumber: this.lineNumber,
        lineStart: this.lineStart,
        start: start,
        end: this.index
    };
}

Tokenizer.prototype.scanOctalLiteral = function(start) {
    var number = '0' + this.source[this.index++];
    while (this.index < this.length) {
        if (!isOctalDigit(this.source[this.index])) {
            break;
        }
        number += this.source[this.index++];
    }

    if (isIdentifierStart(this.source.charCodeAt(this.index)) || isDecimalDigit(this.source.charCodeAt(this.index))) {
        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    return {
        type: Token.NumericLiteral,
        value: parseInt(number, 8),
        octal: true,
        lineNumber: this.lineNumber,
        lineStart: this.lineStart,
        start: start,
        end: this.index
    };
}

Tokenizer.prototype.scanNumericLiteral = function() {
    var number, start, ch;

    ch = this.source[this.index];
    assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
        'Numeric literal must start with a decimal digit or a decimal point');

    start = this.index;
    number = '';
    if (ch !== '.') {
        number = this.source[this.index++];
        ch = this.source[this.index];

        // Hex number starts with '0x'.
        // Octal number starts with '0'.
        if (number === '0') {
            if (ch === 'x' || ch === 'X') {
                ++this.index;
                return this.scanHexLiteral(start);
            }
            if (isOctalDigit(ch)) {
                return this.scanOctalLiteral(start);
            }

            // decimal number starts with '0' such as '09' is illegal.
            if (ch && isDecimalDigit(ch.charCodeAt(0))) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        while (isDecimalDigit(this.source.charCodeAt(this.index))) {
            number += this.source[this.index++];
        }
        ch = this.source[this.index];
    }

    if (ch === '.') {
        number += this.source[this.index++];
        while (isDecimalDigit(this.source.charCodeAt(this.index))) {
            number += this.source[this.index++];
        }
        ch = this.source[this.index];
    }

    if (ch === 'e' || ch === 'E') {
        number += this.source[this.index++];

        ch = this.source[this.index];
        if (ch === '+' || ch === '-') {
            number += this.source[this.index++];
        }
        if (isDecimalDigit(this.source.charCodeAt(this.index))) {
            while (isDecimalDigit(this.source.charCodeAt(this.index))) {
                number += this.source[this.index++];
            }
        } else {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
    }

    if (isIdentifierStart(this.source.charCodeAt(this.index))) {
        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    return {
        type: Token.NumericLiteral,
        value: parseFloat(number),
        lineNumber: this.lineNumber,
        lineStart: this.lineStart,
        start: start,
        end: this.index
    };
}

// 7.8.4 String Literals

Tokenizer.prototype.scanStringLiteral = function() {
    var str = '', quote, start, ch, code, unescaped, restore, octal = false, startLineNumber, startLineStart;
    startLineNumber = this.lineNumber;
    startLineStart = this.lineStart;

    quote = this.source[this.index];
    assert((quote === '\'' || quote === '"'),
        'String literal must starts with a quote');

    start = this.index;
    ++this.index;

    while (this.index < this.length) {
        ch = this.source[this.index++];

        if (ch === quote) {
            quote = '';
            break;
        } else if (ch === '\\') {
            ch = this.source[this.index++];
            if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
                switch (ch) {
                case 'u':
                case 'x':
                    restore = this.index;
                    unescaped = this.scanHexEscape(ch);
                    if (unescaped) {
                        str += unescaped;
                    } else {
                        this.index = restore;
                        str += ch;
                    }
                    break;
                case 'n':
                    str += '\n';
                    break;
                case 'r':
                    str += '\r';
                    break;
                case 't':
                    str += '\t';
                    break;
                case 'b':
                    str += '\b';
                    break;
                case 'f':
                    str += '\f';
                    break;
                case 'v':
                    str += '\x0B';
                    break;

                default:
                    if (isOctalDigit(ch)) {
                        code = '01234567'.indexOf(ch);

                        // \0 is not octal escape sequence
                        if (code !== 0) {
                            octal = true;
                        }

                        if (this.index < this.length && isOctalDigit(this.source[this.index])) {
                            octal = true;
                            code = code * 8 + '01234567'.indexOf(this.source[this.index++]);

                            // 3 digits are only allowed when string starts
                            // with 0, 1, 2, 3
                            if ('0123'.indexOf(ch) >= 0 &&
                                    this.index < this.length &&
                                    isOctalDigit(this.source[this.index])) {
                                code = code * 8 + '01234567'.indexOf(this.source[this.index++]);
                            }
                        }
                        str += String.fromCharCode(code);
                    } else {
                        str += ch;
                    }
                    break;
                }
            } else {
                ++this.lineNumber;
                if (ch ===  '\r' && this.source[this.index] === '\n') {
                    ++this.index;
                }
                this.lineStart = this.index;
            }
        } else if (isLineTerminator(ch.charCodeAt(0))) {
            break;
        } else {
            str += ch;
        }
    }

    if (quote !== '') {
        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    return {
        type: Token.StringLiteral,
        value: str,
        octal: octal,
        startLineNumber: startLineNumber,
        startLineStart: startLineStart,
        lineNumber: this.lineNumber,
        lineStart: this.lineStart,
        start: start,
        end: this.index
    };
}

function testRegExp(pattern, flags) {
    var value;
    try {
        value = new RegExp(pattern, flags);
    } catch (e) {
        throwError({}, Messages.InvalidRegExp);
    }
    return value;
}

// Assumes that the initial '/' has already been consumed
Tokenizer.prototype.scanRegExpBody = function() {
    var ch, str, classMarker, terminated, body;

//    ch = this.source[this.index];
//    assert(ch === '/', 'Regular expression literal must start with a slash');
//    str = this.source[this.index++];
    var str = '/';

    classMarker = false;
    terminated = false;
    while (this.index < this.length) {
        ch = this.source[this.index++];
        str += ch;
        if (ch === '\\') {
            ch = this.source[this.index++];
            // ECMA-262 7.8.5
            if (isLineTerminator(ch.charCodeAt(0))) {
                throwError({}, Messages.UnterminatedRegExp);
            }
            str += ch;
        } else if (isLineTerminator(ch.charCodeAt(0))) {
            throwError({}, Messages.UnterminatedRegExp);
        } else if (classMarker) {
            if (ch === ']') {
                classMarker = false;
            }
        } else {
            if (ch === '/') {
                terminated = true;
                break;
            } else if (ch === '[') {
                classMarker = true;
            }
        }
    }

    if (!terminated) {
        throwError({}, Messages.UnterminatedRegExp);
    }

    // Exclude leading and trailing slash.
    body = str.substr(1, str.length - 2);
    return {
        value: body,
        literal: str
    };
}

Tokenizer.prototype.scanRegExpFlags = function() {
    var ch, str, flags, restore;

    str = '';
    flags = '';
    while (this.index < this.length) {
        ch = this.source[this.index];
        if (!isIdentifierPart(ch.charCodeAt(0))) {
            break;
        }

        ++this.index;
        if (ch === '\\' && this.index < this.length) {
            ch = this.source[this.index];
            if (ch === 'u') {
                ++this.index;
                restore = this.index;
                ch = this.scanHexEscape('u');
                if (ch) {
                    flags += ch;
                    for (str += '\\u'; restore < this.index; ++restore) {
                        str += this.source[restore];
                    }
                } else {
                    this.index = restore;
                    flags += 'u';
                    str += '\\u';
                }
                throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
            } else {
                str += '\\';
                throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        } else {
            flags += ch;
            str += ch;
        }
    }

    return {
        value: flags,
        literal: str
    };
}

Tokenizer.prototype.scanRegExp = function() {
    var start, body, flags, pattern, value;

    this.skipComment();
    start = this.index;

    body = this.scanRegExpBody();
    flags = this.scanRegExpFlags();
    value = testRegExp(body.value, flags.value);

    return {
        type: Token.RegularExpression,
        value: value,
        lineNumber: this.lineNumber,
        lineStart: this.lineStart,
        start: start,
        end: this.index
    };
}

Tokenizer.prototype.collectRegExpToken = function() {
    var loc, token;

    loc = {
        start: {
            line: this.lineNumber,
            column: this.index - this.lineStart - 1
        }
    };

    token = this.scanRegExp();
    token.loc = loc;
    token.loc.end = {
        line: this.lineNumber,
        column: this.index - this.lineStart
    };

    return token;
}

function isIdentifierName(token) {
    return token.type === Token.Identifier ||
        token.type === Token.Keyword ||
        token.type === Token.BooleanLiteral ||
        token.type === Token.NullLiteral;
}

Tokenizer.prototype.advance = function() {
    var ch;

    this.skipComment();

    if (this.index >= this.length) {
        return {
            type: Token.EOF,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: this.index,
            end: this.index
        };
    }

    ch = this.source.charCodeAt(this.index);

    if (isIdentifierStart(ch)) {
        return this.scanIdentifier();
    }

    // Very common: ( and ) and ;
    if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
        return this.scanPunctuator();
    }

    // String literal starts with single quote (U+0027) or double quote (U+0022).
    if (ch === 0x27 || ch === 0x22) {
        return this.scanStringLiteral();
    }


    // Dot (.) U+002E can also start a floating-point number, hence the need
    // to check the next character.
    if (ch === 0x2E) {
        if (isDecimalDigit(this.source.charCodeAt(this.index + 1))) {
            return this.scanNumericLiteral();
        }
        return this.scanPunctuator();
    }

    if (isDecimalDigit(ch)) {
        return this.scanNumericLiteral();
    }

    return this.scanPunctuator();
}

Tokenizer.prototype.collectToken = function() {
    var loc, token;

    this.skipComment();
    loc = {
        start: {
            line: this.lineNumber,
            column: this.index - this.lineStart
        }
    };

    token = this.advance();
    token.loc = loc;
    token.loc.end = {
        line: this.lineNumber,
        column: this.index - this.lineStart
    };

    return token;
}

Tokenizer.prototype.next = function() {
    if (this.lookahead != null) {
        this.lookback = this.lookahead;
        this.lookahead = null;
        return this.lookback;
    }

    if (this.lookback != null) {
        this.lineNumber = this.lookback.lineNumber;
        this.lineStart = this.lookback.lineStart;
        this.index = this.lookback.end;
    }

    this.lookback = this.collectToken();
    if (this.lookback.type === Token.EOF) {
        this.lookback = undefined;
    }

//    this.index = token.end;
//    this.lineNumber = token.lineNumber;
//    this.lineStart = token.lineStart;

    return this.lookback;
}

Tokenizer.prototype.peek = function() {
    if (this.lookahead != null) {
        return this.lookahead;
    }


    if (this.lookback != null) {
        this.lineNumber = this.lookback.lineNumber;
        this.lineStart = this.lookback.lineStart;
        this.index = this.lookback.end;
    }

    this.lookahead = this.collectToken();
    if (this.lookahead.type === Token.EOF) {
        this.lookahead = undefined;
    }
    return this.lookahead;
}

exports.newTokenizer = function(source) {
    var tokenizer = new Tokenizer(source);
    return {

        presume : function(tokenValue, consume) {
           var t = tokenizer.peek();
            if (t && t.value === tokenValue) {
                if (consume) {
                    tokenizer.lookback = t;
                    tokenizer.lookahead = null;
                }
                return t;
            }
            return undefined;
        },

        presumeIdentifier : function(consume) {
            var t = tokenizer.peek();
            if (t && t.type === Token.Identifier) {
                if (consume) {
                    tokenizer.lookback = t;
                    tokenizer.lookahead = null;
                }
                return t;
            }
            return undefined;
        },

        expect : function(tokenValue, errorMsg) {
            var t = tokenizer.next();
            if (t && t.value === tokenValue) {
                return t;
            }
            if (errorMsg) {
                throw errorMsg;
            }   
            throw "Expected " + tokenValue + " but got " + (t ? t.value : " EOF");
        },

        expectIdentifier : function(errorMsg) {
           var t = tokenizer.next();
            if (t && t.type === Token.Identifier) {
                return t;
            }
            if (errorMsg) {
                throw errorMsg;
            }   
            throw "Expected " + tokenValue + " but got " + (t ? t.value : " EOF");
        },

        expectRegExp : function(errorMsg) {
            if (!tokenizer.lookback || tokenizer.lookback.type !== Token.Punctuator || tokenizer.lookback.value !== '/') {
                throw "SyntaxError: Expected a regular expression starting with '/'"
            }
            try {
                tokenizer.lineNumber = tokenizer.lookback.lineNumber;
                tokenizer.lineStart = tokenizer.lookback.lineStart;
                tokenizer.index = tokenizer.lookback.end;
                tokenizer.lookback = collectRegExpToken();
            } catch(e) {
                if (errorMsg) {
                    throw errorMsg;
                } else {
                    throw e;
                }
           }
            return tokenizer.lookback;
        },

        lookback : function() {
            return tokenizer.lookback;
        },

        next : function() {
            return tokenizer.next();
        },

        lookahead : function() {
            return tokenizer.peek();
        },

        registerKeyword : function(keyword) {
            tokenizer.registerKeyword(keyword);
        },

        registerPunctuator : function(punctuator) {
            tokenizer.registerPunctuator(punctuator);
        }
    };
}
