/**
 * Created by mtford on 20/02/2014.
 *
 */

exports.init = function () {

    var ssh = require('./ssh')
        , Nedb = require('nedb')
        , config = require('../config')
        , historical = require('./historical')
        , Logger = config.logger
        , async = require('async')
        , _ = require('underscore');

    var pools = [];
    var monitors = [];

    Logger.verbose('Configuring monitors');
    var servers = config.servers;

    for (var i=0;i<servers.length;i++) {
        var server = servers[i];
        Logger.info('Configuring monitor for ' + server.name);
        Logger.verbose('Reading private key for ' + server.name);
        processServer(server);
        server.max = config.poolSize;
        server.min = config.maintainConnections;
        constructStatsMonitor(server);
    }

    Logger.info('Configuring database at ' + config.dataFile);
    var db = new Nedb({
        filename: config.dataFile,
        autoload: true
    });

    Logger.debug('Configuring listener');
    var listener = new historical.NedbStatsListener(db, monitors);

    configureSignalHandlers();

    Logger.verbose('Startup complete');


    /**
     * Given a server configuration, processes it so will be accepted by SSH library
     * @param server
     */
    function processServer(server) {
        if (server.hasOwnProperty('privateKey')) {
            server.privateKey = require('fs').readFileSync('/Users/mtford/Dropbox/Drake/Server-Side/dev.pem').toString();
        }
    }

    /**
     * Given a server configuration, constructs a monitor that periodically polls the server over ssh connections
     * from a pool
     * @param server
     * @returns {{sshPool: *, statsMonitor: *}}
     */
    function constructStatsMonitor(server) {
        var sshPool = ssh.SSHConnectionPool(server);
        pools.push(sshPool);
        var statsMonitor = historical.StatsMonitor(sshPool, server.monitoringOptions.diskSpace, config.rate);
        statsMonitor.start();
        monitors.push(statsMonitor);
        return {sshPool: sshPool, statsMonitor: statsMonitor};
    }

    /**
     * React to signals e.g. SIGINT (ctrl+c)
     */
    function configureSignalHandlers() {
        process.on('SIGINT', function () {
            Logger.debug('Received SIGINT');
            cleanShutDown();
        });
    }

    /**
     * Close all open resources before terminating
     */
    function cleanShutDown() {
        Logger.info('Shutting down');
        terminateMonitors();
        drainPools(function () {
            process.exit(0);
        });
    }

    /**
     * Stops listening to any emissions. This is important, as when the pools start draining we cannot acquire
     * any more connections.
     */
    function terminateMonitors() {
        Logger.debug('Shutting down monitors');
        for (var i = 0; i < monitors.length; i++) {
            var monitor = monitors[i];
            monitor.stop();
        }
    }

    /**
     * Cycles through all SSH pools and drains them, hence terminating all SSH connections cleanly.
     */
    function drainPools(callback) {
        Logger.info('Closing all SSH connections');
        var drainOperations = constructDrainOperations();
        async.parallel(drainOperations, function (err) {
            if (err) Logger.error('Error when shutting down SSH pools: ' + err.toString() + " which means some connections may be left open");
            if (Logger.info) {
                db.count({}, function (err, count) {
                    if (err) Logger.error('Unable to count number of records in nedb at ' + config.dataFile);
                    else Logger.info('Database contains ' + count.toString() + ' records');
                    callback();
                });
            }
            else {
                callback();
            }
        });
    }

    /**
     * Construct drain operations by binding each SSHConnectionPool to drain function.
     * @returns {*}
     */
    function constructDrainOperations() {
        return _.map(pools, function (x) {
            return ssh.SSHConnectionPool.prototype.drain.bind(x)
        });
    }

};

