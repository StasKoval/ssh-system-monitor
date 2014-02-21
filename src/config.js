/**
 * Created by mtford on 21/02/2014.
 */

(function () {
    var config = require('../config')
        , Winston = require('winston')
        , _ = require('underscore');


    _.defaults(exports, config); // Export the root configuration.

    var serverDefaults = {
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

    for (var i=0; i<exports.servers.length; i++) {
        var server = exports.servers[i];
        _.defaults(server, serverDefaults);
        if (server.hasOwnProperty('privateKey')) {
            server.privateKey = require('fs').readFileSync(server.privateKey ).toString();
        }
    }

    exports.logger = new (Winston.Logger)({
        transports: [
            new (Winston.transports.Console)({ json: false, timestamp: true, level: exports.logLevel })
        ],
        exitOnError: false
    });

    exports.integrationTestServer = exports.servers.length ? exports.servers[0] : null;

})();



