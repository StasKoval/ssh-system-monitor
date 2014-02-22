/**
 * Makes available some example analytics against data collected in nedb
 */

var config = require('./config')
    , Logger = config.logger
    , statTypes = config.statTypes
    , ssh = require('./ssh')
    , _ = require('underscore');

/**
 * A wrapper around an nedb instance that provides analytics on the historical stats
 * @param db
 * @constructor
 */
var Analytics = function (db) {

    // TODO: Take multiple servers to perform analysis against.

    if (!(this instanceof Analytics))
        return new Analytics(db);

    this.db = db;

};


Analytics.prototype.range = function (type, startDate, endDate, callback) {
    var query = {type: type};
    if (startDate || endDate) query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
    this.db.find(query, function (err, docs) {
        var results = null;
        if (err) Logger.error('Error getting range of ' + type, err);
        else results = _.map(docs, function (x) {return {date: x.date, value: x.value}});
        callback(err, results);
    });
};

/**
 * Return all cpu usage data points between startDate -> endDate
 * @param [startDate]
 * @param [endDate]
 * @param [callback]
 */
Analytics.prototype.cpuUsage = function (startDate, endDate, callback) {
    var type = statTypes.cpuUsage;
    this.range(type, startDate, endDate, callback);
};

/**
 * Return all swap usage data points between startDate -> endDate
 * @param [startDate]
 * @param [endDate]
 * @param [callback]
 */
Analytics.prototype.swapUsage = function (startDate, endDate, callback) {
    var type = statTypes.swapUsed;
    this.range(type, startDate, endDate, callback);
};

Analytics.prototype.memoryUsage = function (startDate, endDate, callback) {
    var type = statTypes.memoryUsed;
    this.range(type, startDate, endDate, callback);
};

/**
 * Calculate mean CPU usage between startDate -> endDate
 * @param [startDate]
 * @param [endDate]
 * @param [callback]
 */
Analytics.prototype..meanCpuUsage = function (startDate, endDate, callback) {
    var type = statTypes.cpuUsage;
    var query = { type: type};
    if (startDate || endDate) query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
    this.db.find(query, function (err, docs) {
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