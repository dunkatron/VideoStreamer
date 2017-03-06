///<reference path='../typings/node/node.d.ts' />

var RpcClient = require('node-json-rpc2').Client;
var config = require('../config.js');

var client = new RpcClient({
    protocol:'http',//Optional. Will be http by default
    path:'/',
    port:config.port,
    method:'GET'
});

var args = process.argv.slice(2);
var command = args[0] || "help";

client.call({
    method:command,
    params:args.slice(1)
    }, function(err, result) {
    if (err) {
        console.log(err);
    } else {
        console.log(result.result);
    }
});