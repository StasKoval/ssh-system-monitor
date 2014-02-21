/**
 * Created by mtford on 31/01/2014.
 */

var Connection = require('ssh2');
var Fs = require('fs');
var Util = require('./utils');
var Logger = require('./../config').logger;
var poolModule = require('generic-pool');
var _ = require('underscore');
var util = require("util");

// TODO: Get unix timestamp and return that along with the value.

var memInfoKey = {
    MemTotal: 'MemTotal',
    MemFree: 'MemFree',
    Buffers: 'Buffers',
    Cached: 'Cached',
    SwapCached: 'SwapCached',
    Active: 'Active',
    Inactive: 'Inactive',
    Unevictable: 'Unevictable',
    Mlocked: 'Mlocked',
    SwapTotal: 'SwapTotal',
    SwapFree: 'SwapFree',
    Dirty: 'Dirty',
    Writeback: 'Writeback',
    AnonPages: 'AnonPages',
    Mapped: 'Mapped',
    Shmem: 'Shmem',
    Slab: 'Slab',
    SReclaimable: 'SReclaimable',
    SUnreclaim: 'SUnreclaim',
    KernelStack: 'KernelStack',
    PageTables: 'PageTables',
    NFS_Unstable: 'NFS_Unstable',
    Bounce: 'Bounce',
    WritebackTmp: 'WritebackTmp',
    CommitLimit: 'CommitLimit',
    Committed_AS: 'Committed_AS',
    VmallocTotal: 'VmallocTotal',
    VmallocUsed: 'VmallocUsed',
    VmallocChunk: 'VmallocChunk',
    HardwareCorrupted: 'HardwareCorrupted',
    AnonHugePages: 'AnonHugePages',
    HugePages_Total: 'HugePages_Total',
    HugePages_Free: 'HugePages_Free',
    HugePages_Rsvd: 'HugePages_Rsvd',
    HugePages_Surp: 'HugePages_Surp',
    Hugepagesize: 'Hugepagesize',
    DirectMap4k: 'DirectMap4k',
    DirectMap2M: 'DirectMap2M'
};

/**
 * Extends Connection with standard operations over ssh.
 * @param opts
 * @constructor
 */
var VisionConnection = function () {
    Connection.call(this);
};

util.inherits(VisionConnection, Connection);

/**
 * Get percentage swap used as a float
 * @param callback
 */
VisionConnection.prototype.swapUsedPercentage = function(callback) {
    var self = this;
    this.memoryInfo(function (err, info) {
        if (err && callback) {
            callback(err, null);
        }
        else {
            if (callback) callback(null,info[memInfoKey.SwapFree]  / info[memInfoKey.SwapTotal]);
        }
    })
};

/**
 * Get percentage swap used as a float
 * @param callback
 */
VisionConnection.prototype.memoryUsed = function(callback) {
    var self = this;
    this.memoryInfo(function (err, info) {
        if (err && callback) callback(err, null);
        else {
            var memoryFree = info[memInfoKey.MemFree];
//            var buffers = info[self.memInfoKey.Buffers];
            var cached = info[memInfoKey.Cached];
            var realFree = memoryFree + cached;
            var perc = realFree / info[memInfoKey.MemTotal];
            if (callback) callback(null, perc);
        }
    })
};

/**
 * Takes average load over 1 minute, 5 minutes and 15 minutes from uptime command
 * @param callback
 */
VisionConnection.prototype.averageLoad = function (callback) {
    this.execute('uptime', function(err, data) {
        if (err) callback(err, data);
        else {
            var averages = data.split('load average:');
            Logger.debug(averages);
            averages = averages[averages.length-1].trim().split(' ');
            averages = {
                1: parseFloat(averages[0]),
                5: parseFloat(averages[1]),
                15: parseFloat(averages[2])
            };
            callback(null, averages);
        }
    });
};

VisionConnection.prototype.cpuUsage = function (callback) {
    this.execute('top -b -d1 -n1|grep -i "Cpu(s)"|head -c21|cut -d \' \' -f3|cut -d \'%\' -f1', function (err, data) {
        if (callback) callback(err, parseFloat(data));
    });
};

/**
 * Prints /proc/meminfo to stdout and parses it into a dictionary.
 * @param callback
 */
VisionConnection.prototype.memoryInfo = function (callback) {
    this.execute('cat /proc/meminfo', function (err, data) {
        if (err && callback) callback (err, null);
        else {
            var kv = _.map(data.split('\n'), function (x) {return x.split(':')});
            kv.pop(); // Remove spurious last val.
            kv = _.map(kv, function(x) {
                var key = x[0];
                var val = x[1];
                if (val) {
                    val = val.trim();
                    if (val.indexOf('kB') != -1)  val = val.substring(0, val.length-3);
                    val = parseInt(val);
                }
                return [key, val];
            });
            var info = _.reduce(kv, function(memo, x) {memo[x[0]] = x[1]; return memo},{});
            if (callback) callback(null, info);
        }
    });
};

VisionConnection.prototype.execute = function(exec_str, callback) {
    var self = this;
    self.exec(exec_str, function (err, stream) {
        if (err && callback) callback(err);
        else {
            stream.on('data', function (data, extended) {
                if (extended === 'stderr') {
                    callback (data.toString(), null);
                }
                else {
                    if (callback) callback (null, data.toString());
                }
            });
        }
    });
};

/**
 * Return the percentage disk space used on mount being used at path
 * @param path
 * @param callback
 */
function percentageUsed(path, callback) {
    this.execute('df ' + path + ' -h | tail -n 1', function (err, data) {
        if (err && callback) callback(err, null);
        else {
            var percentageString = data.match(/\S+/g)[4];
            var percentageUsed = parseFloat(percentageString.substring(0, percentageString.length - 1)) / 100;
            if (callback) callback(null, percentageUsed);
        }
    });
}

VisionConnection.prototype.percentageUsed = function(path, callback) {
    percentageUsed.call(this, path, callback);
};

VisionConnection.prototype.percentageFree = function(path, callback) {
    percentageUsed.call(this, path, function(error, percentageUsed) {
        callback(error, percentageUsed ? 1 - percentageUsed : null);
    });
};

/**
 * Log host+port details as well as the message.
 * @param level
 * @param message
 */
function log(level, message) {
    message = 'SSHConnectionPool[' + this.options.host + ":" + this.options.port.toString() + "] " + message;
    Logger.log(level, message);
}



/**
 * Provides access to pool of ssh connections with basic system inspection methods
 * @param options
 * @constructor
 */
var SSHConnectionPool = function(options) {

    var self = this;

    if (!(this instanceof SSHConnectionPool))
        return new SSHConnectionPool(options);

    // The below specifies available options
    var defaultOptions = {
        host: '',
        port: null,
        username: '',
        privateKey: null,
        max: 10,
        min: 2
    };

    this.options = Util.mergeOptions(defaultOptions, options);

    this.pool = poolModule.Pool({
        name     : 'ssh',
        create   : _.bind(this.spawnClient, self), // For some reason this bind is neccessary. Why?
        destroy  : _.bind(this.destroyClient, self),
        max      : self.options.max,
        min      : self.options.min,
        idleTimeoutMillis : 30000,
        log : true
    });

    this.acquire = this.pool.acquire;
    this.release = this.pool.release;

};

SSHConnectionPool.prototype.spawnClient = function (callback) {
    var self = this;
    var client = new VisionConnection();
    client.on('ready', function() {
        log.call(self, 'info', 'Connection ready');
        callback(null,client);
    });
    client.on('error', function(e) {
        log.call(self, 'error', self.toString() + ':' + e);
        callback(e,null);
    });
    client.on('end', function() {
        log.call(self, 'info', 'Connection ended');
    });
    client.on('close', function() {
        log.call(self, 'info', 'Connection closed');
    });
    client.connect({
        host: this.options.host,
        port: this.options.port,
        username: this.options.username,
        privateKey: this.options.privateKey
    });
    return client;
};

SSHConnectionPool.prototype.destroyClient = function (client) {
    client.end();
};

/**
 * Terminates all ssh connections in the pool.
 * @param callback
 */
SSHConnectionPool.prototype.drain = function (callback) {
    Logger.debug('Closing all');
    var self = this;
    this.pool.drain(function() {
        Logger.debug('In drain state');
        self.pool.destroyAllNow(function () {
            Logger.debug('All destroyed');
            if (callback) callback();
        });
    });
};

SSHConnectionPool.prototype.oneShot = function(callback) {
    var self = this;
    this.acquire(function(err, client) {
        if (err || client) {
            callback(err, client);
        }
        else {
            callback('Unable to obtain an SSH client connection', null);
        }
        self.release(client);
    });
};

SSHConnectionPool.prototype.toString = function() {
    return 'Pool<' + this.options.host + ':' + this.options.port.toString() + '>';
};

exports.SSHConnectionPool = SSHConnectionPool;
exports.VisionConnection = VisionConnection;
exports.memInfoKey = memInfoKey;