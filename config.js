/**
 * Servers
 */

//var Servers = [{
//    name: 'Name',
//    host: 'x.x.x.x',
//    port: 22,
//    username: 'ubuntu',
//    privateKey: require('fs').readFileSync('/path/to/privateKey').toString()
//}];

// List all servers to be monitored.
var servers = [{
    name: 'MosaycDev',
    host: '46.51.201.85',
    port: 22,
    username: 'ubuntu',
    privateKey: require('fs').readFileSync('/Users/mtford/Dropbox/Drake/Server-Side/dev.pem').toString()
}];

// Specify server configuration for use in integration tests.
var integrationTestServer = servers.length ? servers[0] : null;

/**
 * Logging
 */

var Winston = require('winston');
var logger = new (Winston.Logger)({
    transports: [
        new (Winston.transports.Console)({ json: false, timestamp: true, level: 'debug' })
    ],
    exitOnError: false
});

exports.logger = logger;
exports.servers = servers;