/**
 * Takes the root config and extends with internal configuration + some massaging.
 */

var config = require('../config')
    , Winston = require('winston')
    , _ = require('underscore');

(function () {

    _.defaults(exports, config); // Import the root configuration.

    _.defaults(exports, { // Fill in the gaps
        servers: [],
        dataFile: '/tmp/ssh-system-monitor/ssm.dat',
        rate: 1000,
        poolSize: 10,
        maintainConnections: 2,
        logLevel: 'info'
    });

    exports.serverDefaults = {
        name: null,
        host: null,
        port: null,
        username: null,
        password: null,
        privateKey: null,
        monitoringOptions: {
            diskSpace: []
        }
    };

    processServers();

    var Logger = new (Winston.Logger)({
        transports: [
            new (Winston.transports.Console)({ json: false, timestamp: true, level: exports.logLevel })
        ],
        exitOnError: false
    });

    exports.logger = Logger;

    var testType = process.env.TEST_TYPE;
    Logger.debug('TEST_TYPE=', testType);
    if (testType == 'unit') {
        Logger.debug('Running as unit tests due as explicitly specified');
        exports.integrationTestServer = null;
    }
    else {
        if (testType == 'integration' && !exports.servers.length) {
            throw 'Cant run integration tests without specifying servers in config.js=>exports.servers'
        }
        else {
            exports.integrationTestServer = exports.servers.length ? exports.servers[0] : null;
            if (exports.integrationTestServer) Logger.debug('Running as integration tests');
        }
    }

    exports.statTypes = {
        cpuUsage: 'cpuUsage',
        swapUsed: 'swapUsed',
        diskSpaceUsed: 'diskSpaceUsed',
        memoryUsed: 'memoryUsed'
    };

    /**
     * Merge with the default server options and read any private key files.
     */
    function processServers() {
        for (var i = 0; i < exports.servers.length; i++) {
            var server = exports.servers[i];
            _.defaults(server, exports.serverDefaults);
            if (server.hasOwnProperty('privateKey')) {
                server.privateKey = require('fs').readFileSync(server.privateKey).toString();
            }
        }
    }

})();



