/**
 * Created by mtford on 18/02/2014.
 */

var async = require('async')
    , EventEmitter = require('events').EventEmitter
    , util = require('util')
    , Logger = require('../config').logger
    , ssh = require('./ssh')
    , _ = require('underscore');

/**
 * An event emitter that will emit server stats at a given rate.
 * @param sshPool - The pool of ssh connections from which to draw statistics.
 * @param [filePaths] - List of file paths for disk space monitoring
 * @param {float} [rate] - The rate at which to collect statistics. Defaults to 1000ms (every 1 second)
 * @constructor
 */
var StatsMonitor = function (sshPool, filePaths, rate) {

    // TODO: Add multiple server configurations.
    // TODO: Don't use ssh pools?
    // TODO: Arguments should be an options dictionary.

    if (!(this instanceof StatsMonitor))
        return new StatsMonitor(sshPool, filePaths, rate);

    var self = this;
    EventEmitter.call(this);

    this.sshPool = sshPool;
    this.rate = rate;
    this.filePaths = filePaths;

    if (!this.rate) {
        this.rate = 1000; // Every second
    }

    this.start = function () {
        var functions = [swapUsed, load, memoryUsed];
//        var diskSpaceFunctions = _.map(self.filePaths, function (x) { // TODO: Can't partially apply if only one arg??
//            return _.partial(diskSpace, x)
//        });
        self.intervalIdentifiers = _.map(functions, function (f) {
            return setInterval(f, self.rate);
        });
        self.intervalIdentifiers.concat(_.map(this.filePaths, function (filePath) {
            return setInterval(diskSpace, self.rate, filePath);
        }));
    };

    this.stop = function () {
        if (Logger.verbose) Logger.verbose('Stopping stats monitor');
        _.map(self.intervalIdentifiers, function(x) {clearInterval(x)});
        if (Logger.verbose) Logger.verbose('Stopped stats monitor');
    };

    function swapUsed () {
        if (Logger.verbose) Logger.verbose('Checking swap used');
        self.sshPool.oneShot(function(err, client) {
            if (err) self.emit('error', err);
            else {
                client.swapUsedPercentage(function(err, swapUsed) {
                    if (err) self.emit('error', err);
                    else self.emit('swapUsed', swapUsed);
                })
            }
        })
    }

    function load () { // TODO: Get current CPU rather than 1min avg.
        if (Logger.verbose) Logger.verbose('Checking avg load');
        self.sshPool.oneShot(function(err, client) {
            if (err) self.emit('error', err);
            else {
                client.cpuUsage(function(err, usage) {
                    if (err) self.emit('error', err);
                    else self.emit('cpuUsage', usage);
                });
            }
        });
    }

    function diskSpace (path) {
        if (Logger.debug) Logger.debug('Checking disk space for ' + path);
        self.sshPool.oneShot(function(err, client) {
            if (err) self.emit('error', err);
            else {
                client.percentageUsed(path, function(err, usage) {
                    if (err) self.emit('error', err);
                    else {
                        var d = {};
                        d[path] = usage;
                        if (Logger.verbose) Logger.verbose('Emitting disk space used');
                        self.emit('diskSpaceUsed', d);
                    }
                });
            }
        });
    }

    function memoryUsed () {
        if (Logger.verbose) Logger.verbose('Checking memory used');
        self.sshPool.oneShot(function(err, client) {
            if (err) self.emit('error', err);
            else {
                client.memoryUsed(function(err, usage) {
                    if (err) self.emit('error', err);
                    else {
                        if (Logger.verbose) Logger.verbose('Emitting memory used');
                        self.emit('memoryUsed', usage);
                    }
                });
            }
        });
    }

};

util.inherits(StatsMonitor, EventEmitter);

/**
 * Listens to a stats monitor and logs any output.
 * @param statsMonitor - An instance of StatsMonitor from which to listen
 * @constructor
 */
var LogStatsListener = function (statsMonitor) {
    if (!(this instanceof LogStatsListener))
        return new LogStatsListener(statsMonitor);

    this.start = statsMonitor.start;
    this.stop = statsMonitor.stop;

    statsMonitor.on('error', function(err) {
        Logger.error('Stats monitor returned error:',err);
    });

    statsMonitor.on('cpuUsage', function(cpuUsage) {
        Logger.info('CPU Usage:',cpuUsage);
    });

    statsMonitor.on('swapUsed', function (swapUsed) {
        Logger.info('Swap used:', swapUsed);
    });
};

/**
*
 * @param {Nedb} db - An instance of require('nedb')
 * @param {...number} var_args
* @constructor
*/
var NedbStatsListener = function (db) {

    // TODO: new Date() on emission received. This doesn't reflect server time obviously... need that over SSH also.

    this.statsMonitors = _.flatten(_.rest(arguments)); // This means that statsMonitors can be var_arg or array

    function getHost(statsMonitor) {
        return statsMonitor.sshPool.options.host;
    }

    for (var i=0;i<this.statsMonitors.length;i++) {
        listenToStatsMonitor(this.statsMonitors[i]);
    }

    function listenToStatsMonitor(statsMonitor) {

        Logger.verbose('Listening to stats monitor');

        statsMonitor.on('error', function (err) {
            Logger.error('Stats monitor returned error:', err);
        });

        statsMonitor.on('cpuUsage', function (cpuUsage) {
            //noinspection JSUnresolvedFunction
            db.insert({
                value: cpuUsage,
                type: NedbStatsListener.types.cpuUsage,
                host: getHost(statsMonitor),
                date: new Date()
            }, function (err, newObj) {
                if (err) {
                    Logger.error('Error inserting cpu usage into nedb');
                }
                else {
                    Logger.debug('Created cpuUsage object with id', newObj._id);
                }
            });
        });

        statsMonitor.on('memoryUsed', function (value) {
            //noinspection JSUnresolvedFunction
            db.insert({
                value: value,
                type: NedbStatsListener.types.memoryUsed,
                host: getHost(statsMonitor),
                date: new Date()
            }, function (err, newObj) {
                if (err) {
                    Logger.error('Error inserting memory usage into nedb');
                }
                else {
                    Logger.debug('Created memoryUsed object with id', newObj._id);
                }
            });
        });

        statsMonitor.on('swapUsed', function (swapUsed) {
            //noinspection JSUnresolvedFunction
            db.insert({
                value: swapUsed,
                type: NedbStatsListener.types.swapUsed,
                host: getHost(statsMonitor),
                date: new Date()
            }, function (err, newObj) {
                if (err) {
                    Logger.error('Error inserting swap used into nedb');
                }
                else {
                    Logger.debug('Created swapused object with id', newObj._id);
                }
            });
        });

        statsMonitor.on('diskSpaceUsed', function (diskSpaceUsed) {
            for (var path in diskSpaceUsed) {
                //noinspection JSUnfilteredForInLoop
                db.insert({
                    value: diskSpaceUsed[path],
                    path: path,
                    type: NedbStatsListener.types.diskSpaceUsed,
                    host: getHost(statsMonitor),
                    date: new Date()
                }, function (err, newObj) {
                    if (err) {
                        Logger.error('Error inserting swap used into nedb');
                    }
                    else {
                        Logger.debug('Created diskSpaceUsed object with id', newObj._id);
                    }
                });
            }
        });

    }
};

var statTypes = {
    cpuUsage: 'cpuUsage',
    swapUsed: 'swapUsed',
    diskSpaceUsed: 'diskSpaceUsed',
    memoryUsed: 'memoryUsed'
};

NedbStatsListener.types = statTypes;

/**
 * A wrapper around an nedb instance that provides analytics on the historical stats
 * @param db
 * @constructor
 */
var Analytics = function (db) {

    // TODO: Take multiple servers to perform analysis against.

    if (!(this instanceof Analytics))
        return new Analytics(db);

    /**
     * Return all cpu usage data points between startDate -> endDate
     * @param [startDate]
     * @param [endDate]
     * @param [callback]
     */
    this.cpuUsage = function (startDate, endDate, callback) {
        var type = statTypes.cpuUsage;
        range(type, startDate, endDate, callback);
    };

    /**
     * Return all swap usage data points between startDate -> endDate
     * @param [startDate]
     * @param [endDate]
     * @param [callback]
     */
    this.swapUsage = function (startDate, endDate, callback) {
        var type = statTypes.swapUsed;
        range(type, startDate, endDate, callback);
    };

    function range(type, startDate, endDate, callback) {
        var query = {type: type};
        if (startDate || endDate) query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
        db.find(query, function (err, docs) {
            var results = null;
            if (err) Logger.error('Error getting range of ' + type, err);
            else results = _.map(docs, function (x) {return {date: x.date, value: x.value}});
            callback(err, results);
        });
    }

    /**
     * Calculate mean CPU usage between startDate -> endDate
     * @param [startDate]
     * @param [endDate]
     * @param [callback]
     */
    this.meanCpuUsage = function (startDate, endDate, callback) {
        var type = statTypes.cpuUsage;
        var query = { type: type};
        if (startDate || endDate) query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
        db.find(query, function (err, docs) {
            var results = null;
            if (err) Logger.error('Error getting range of ' + type, err);
            else {
                var n = docs.length;
                results = _.pluck(docs, 'value');
                results = _.reduce(results, function(memo, num) {
                    return memo + num;
                }, 0);
                results = results / n;
            }
            callback(err, results);
        });
    };

};

exports.StatsMonitor = StatsMonitor;
exports.LogStatsListener = LogStatsListener;
exports.NedbStatsListener = NedbStatsListener;
exports.Analytics = Analytics;

//var serverConfig = require('../tests/server/integration/config').server;
//
//var pool = new ssh.SSHConnectionPool(serverConfig);
//var monitor = new StatsMonitor(pool);
//var listener = new LogStatsListener(monitor);
//
//listener.start();
//listener.stop();
//pool.drain();