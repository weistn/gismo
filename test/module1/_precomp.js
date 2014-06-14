function() {
(function () {
    console.log('It\'s compile time for module1');
    parser.newOperand('linepos', function () {
        return {
            type: 'Literal',
            value: 'NEW OPERAND'
        };
    });
}());

}
