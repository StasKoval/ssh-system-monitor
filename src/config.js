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


    var Logger = new (Winston.Logger)({
        levels: {
            trace: 0,
            verbose: 1,
            debug: 2,
            info: 3,
            warn: 4,
            error: 5,
            fatal: 6
        },
        colors: {
            trace: 'grey',
            verbose: 'white',
            debug: 'green',
            info: 'green',
            warn: 'yellow',
            error: 'red',
            fatal: 'red'
        },
        transports: [
            new (Winston.transports.Console)({
                json: false,
                timestamp: true,
                level: exports.logLevel,
                prettyPrint: true,
                colorize: true,
                silent: false
            })
        ],
        exitOnError: false
    });

    exports.logger = Logger;

    processServers();

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
                try {
                    server.privateKey = require('fs').readFileSync(server.privateKey).toString();
                }
                catch (err) {
                    Logger.error('Unable to load private key at ' + server.privateKey,err);
                    server.privateKey = ''; // We will try without the private key anyway. This is more for sake of TravisCI
                }
            }
        }
    }

})();



