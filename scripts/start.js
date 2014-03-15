/**
 * Created by mtford on 21/02/2014.
 */

var system = require('../src/system')
    , config = require('../src/config')
    , logger = config.logger;

system.start();

process.on('SIGINT', function () {
    logger.info('Received SIGINT');
    system.terminate(function () {
        process.exit(0);
    })
});