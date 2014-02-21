/**
 * Servers
 */

// List all servers to be monitored
//var servers = [{
//    name: 'MosaycDev',
//    host: '46.51.201.85',
//    port: 22,
//    username: 'ubuntu',
//    privateKey: require('fs').readFileSync('/Users/mtford/Dropbox/Drake/Server-Side/dev.pem').toString()
//}];

var servers = [{
    name: 'MosaycDev',
    host: '46.51.201.85',
    port: 22,
    username: 'ubuntu',
    privateKey: '/Users/mtford/Dropbox/Drake/Server-Side/dev.pem',
    monitoringOptions: {
        diskSpace: ['/home/ubuntu/', '/mnt']
    }
}
//    ,{
//    name: 'Clarity',
//    host: '188.226.141.90',
//    port: 22,
//    username: 'clarity',
//    privateKey: '/Users/mtford/.ssh/id_rsa',
//    monitoringOptions: {
//        diskSpace: ['/home/clarity/']
//    }
//},{
//    name: 'MosaycProd',
//    host: '54.228.223.187',
//    port: 22,
//    username: 'ubuntu',
//    privateKey: '/Users/mtford/Dropbox/Drake/Server-Side/mosayc.pem',
//    monitoringOptions: {
//        diskSpace: ['/home/ubuntu/', '/mnt']
//    }
//}
];


/**
 * Data
 */

// nedb database will be stored at this location
var dataFile = '/tmp/ssh-system-monitor/ssm.dat';

// rate at which to take datapoints, default to 1 second
var rate = 1000;

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
        new (Winston.transports.Console)({ json: false, timestamp: true, level: 'verbose' })
    ],
    exitOnError: false
});

/**
 * Testing
 */

// Specify server configuration for use in integration tests
var integrationTestServer = servers.length ? servers[0] : null;


exports.logger = logger;
exports.servers = servers;
exports.dataFile = dataFile;
exports.rate = rate;
exports.poolSize = poolSize;
exports.maintainConnections = maintainConnections;
exports.integrationTestServer = function () {
    if (integrationTestServer.hasOwnProperty('privateKey'))
        integrationTestServer.privateKey = require('fs').readFileSync(integrationTestServer.privateKey).toString();
    return integrationTestServer;
}();
