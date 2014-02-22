/**
 * Takes the root config and extends with internal configuration + some massaging.
 */

var config = require('../config')
    , Winston = require('winston')
    , _ = require('underscore');

(function () {

    _.defaults(exports, config); // Import the root configuration.

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

    exports.logger = new (Winston.Logger)({
        transports: [
            new (Winston.transports.Console)({ json: false, timestamp: true, level: exports.logLevel })
        ],
        exitOnError: false
    });

    exports.integrationTestServer = exports.servers.length ? exports.servers[0] : null;

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



