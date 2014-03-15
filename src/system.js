/**
 * Created by mtford on 20/02/2014.
 *
 */
var ssh = require('./ssh')
    , Nedb = require('nedb')
    , pool = require('./pool')
    , monitor = require('./monitor')
    , listener = require('./listener')
    , config = require('./config')
    , logger = config.logger
    , async = require('async')
    , _ = require('underscore');


function System(config) {

    var self = this;

    this._pools = [];
    this._monitors = [];
    this._listeners = [];
    this._config = undefined;
    this._db = undefined;

    this._constructStatsMonitor = function(server) {
        var sshPool = pool.SSHConnectionPool(server);
        self._pools.push(sshPool);
        var statsMonitor = monitor.StatsMonitor(sshPool, server.monitoringOptions.diskSpace, self._config.rate);
        statsMonitor.start();
        self._monitors.push(statsMonitor);
    };

    this._drainPools = function (callback) {
        logger.info('Closing all SSH connections');
        var drainOperations = self._constructDrainOperations();
        async.parallel(drainOperations, function (err) {
            if (err) logger.error('Error when shutting down SSH _pools: ' + err.toString() + " which means some connections may be left open");
            if (logger.info) {
                self._db.count({}, function (err, count) {
                    if (err) logger.error('Unable to count number of records in nedb at ' + config.dataFile);
                    else logger.info('Database contains ' + count.toString() + ' records');
                    callback();
                });
            }
            else {
                callback();
            }
        });
    };

    this._constructDrainOperations = function () {
        return _.map(self._pools, function (x) {
            return pool.SSHConnectionPool.prototype.drain.bind(x)
        });
    };

    this.start = function (config, db) {
        self._config = config;
        self._db = db;
        if (!db) {
            self._db = new Nedb({
                filename: self._config.dataFile,
                autoload: true
            });
        }
        logger.debug('Configuring monitors');
        var servers = self._config.servers;
        for (var i=0;i<servers.length;i++) {
            var server = servers[i];
            logger.debug('Configuring monitor for ' + server.name);
            logger.debug('Reading private key for ' + server.name);
            server.max = self._config.poolSize;
            server.min = self._config.maintainConnections;
            self._constructStatsMonitor(server);
        }
        logger.debug('Configuring listener');
        self._listeners.push(new listener.NedbStatsListener(self._db, self._monitors));
        logger.info('Started!');
    };

    this.terminate = function(callback) {
        logger.debug('Shutting down monitors');
        for (var i = 0; i < self._monitors.length; i++) {
            var monitor = self._monitors[i];
            monitor.stop();
        }
        this._drainPools(function () {
            if (callback) callback();
        });
    }

}

module.exports = new System();