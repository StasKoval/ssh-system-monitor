/**
 * Created by mtford on 21/02/2014.
 */

var config = require('../config')
    , Winston = require('winston')
    , _ = require('underscore');


_.defaults(exports, config); // Export the root configuration.

exports.logger = new (Winston.Logger)({
    transports: [
        new (Winston.transports.Console)({ json: false, timestamp: true, level: exports.logLevel })
    ],
    exitOnError: false
});

exports.integrationTestServer = exports.servers.length ? exports.servers[0] : null;