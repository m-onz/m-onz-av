
var parser = require('parser2_improved.js')

inlets = 1;
outlets = 1;

name = "mixtape";

function list () {
  var pattern = Array.from(arguments).join(' ')
  var output = parser.parser(pattern)
  outlet(0, output)
}
