/**
 * Servers
 */

// List all servers to be monitored
var servers = [{
    name: 'MosaycDev',
    host: '46.51.201.85',
    port: 22,
    username: 'ubuntu',
    privateKey: require('fs').readFileSync('/Users/mtford/Dropbox/Drake/Server-Side/dev.pem').toString()
}];

/**
 * Data
 */

// nedb database will be stored at this location
var dataFile = '/tmp/ssh-system-monitor/ssm.dat';

/**
 * SSH Options
 */

// Maximum SSH connections to each server
var poolSize = 10;

// Minimum number of SSH connections to maintain for each server
var maintainConnections = 2;

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
exports.dataFile = dataFile;

/**
 * Testing
 */

// Specify server configuration for use in integration tests
var integrationTestServer = servers.length ? servers[0] : null;