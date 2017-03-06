var rpc = require('json-rpc2');
var config = require('../config.js');
var client = rpc.Client.$create(config.port, 'localhost');
var args = process.argv.slice(2);
var command = args[0] || "help";
client.call(command, args.slice(1), function (err, result) {
    if (err) {
        console.log(err);
    }
    else {
        console.log(result);
    }
});
//# sourceMappingURL=client.js.map