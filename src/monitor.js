
var EventEmitter = require('events').EventEmitter
    , util = require('util')
    , Logger = require('./config').logger
    , _ = require('underscore');

/**
 * An event emitter that will emit server stats at a given rate.
 * @param sshPool - The pool of ssh connections from which to draw statistics.
 * @param [filePaths] - List of file paths for disk space monitoring
 * @param {float} [rate] - The rate at which to collect statistics. Defaults to 1000ms (every 1 second)
 * @constructor
 */
var StatsMonitor = function (sshPool, filePaths, rate) {

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
        // TODO: Partial application (taking into account variable arguments also...)
        // TODO: Remove functions variable, place all functions in an object instead
        var functions = [swapUsed, load, memoryUsed];
        self.intervalObjects = _.map(functions, function (f) {
            return setInterval(f, self.rate);
        });
        self.intervalObjects.concat(_.map(this.filePaths, function (filePath) {
            return setInterval(diskSpace, self.rate, filePath);
        }));
    };

    this.stop = function () {
        if (Logger.verbose) Logger.verbose('Stopping stats monitor');
        _.map(self.intervalObjects, function(x) {clearInterval(x)});
        if (Logger.verbose) Logger.verbose('Stopped stats monitor');
    };

    function swapUsed () {
        if (Logger.verbose) Logger.verbose('Checking swap used');
        self.sshPool.oneShot(function(err, client) {
            if (err) {
                self.emit('error', err);
            }
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
            if (err) {
                self.emit('error', err);
            }
            else {
                client.cpuUsage(function(err, usage) {
                    if (err) self.emit('error', err);
                    else self.emit('cpuUsage', usage);
                });
            }
        });
    }

    function diskSpace (path) {
        if (Logger.verbose) Logger.verbose('Checking disk space for ' + path);
        self.sshPool.oneShot(function(err, client) {
            if (err) {
                self.emit('error', err);
            }
            else {
                client.percentageUsed(path, function(err, usage) {
                    if (err) {
                        self.emit('error', err);
                    }
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
            if (err) {
                self.emit('error', err);
            }
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

    function functionName(fun) {
        var ret = fun.toString();
        ret = ret.substr('function '.length);
        ret = ret.substr(0, ret.indexOf('('));
        return ret;
    }

};

util.inherits(StatsMonitor, EventEmitter);

exports.StatsMonitor = StatsMonitor;
