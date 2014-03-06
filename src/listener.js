/**
 * Provides various types of listeners. Each listens to the emission of 1 or more monitors.
 */

var config = require('./config')
    , Logger = config.logger
    , statTypes = config.statTypes
    , ssh = require('./ssh')
    , _ = require('underscore');

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
                type: statTypes.cpuUsage,
                host: getHost(statsMonitor),
                date: new Date()
            }, function (err, newObj) {
                if (err) {
                    Logger.error('Error inserting cpu usage into nedb');
                }
                else {
                    Logger.trace('Created cpuUsage object with id', newObj._id);
                }
            });
        });

        statsMonitor.on('memoryUsed', function (value) {
            //noinspection JSUnresolvedFunction
            db.insert({
                value: value,
                type: statTypes.memoryUsed,
                host: getHost(statsMonitor),
                date: new Date()
            }, function (err, newObj) {
                if (err) {
                    Logger.error('Error inserting memory usage into nedb');
                }
                else {
                    Logger.trace('Created memoryUsed object with id', newObj._id);
                }
            });
        });

        statsMonitor.on('swapUsed', function (swapUsed) {
            //noinspection JSUnresolvedFunction
            db.insert({
                value: swapUsed,
                type: statTypes.swapUsed,
                host: getHost(statsMonitor),
                date: new Date()
            }, function (err, newObj) {
                if (err) {
                    Logger.error('Error inserting swap used into nedb');
                }
                else {
                    Logger.trace('Created swapused object with id', newObj._id);
                }
            });
        });

        statsMonitor.on('diskSpaceUsed', function (diskSpaceUsed) {
            for (var path in diskSpaceUsed) {
                //noinspection JSUnfilteredForInLoop
                db.insert({
                    value: diskSpaceUsed[path],
                    path: path,
                    type: statTypes.diskSpaceUsed,
                    host: getHost(statsMonitor),
                    date: new Date()
                }, function (err, newObj) {
                    if (err) {
                        Logger.error('Error inserting swap used into nedb');
                    }
                    else {
                        Logger.trace('Created diskSpaceUsed object with id', newObj._id);
                    }
                });
            }
        });

    }
};

exports.LogStatsListener = LogStatsListener;
exports.NedbStatsListener = NedbStatsListener;