/**
 * Created by mtford on 31/01/2014.
 */

var Connection = require('ssh2')
    , Logger = require('./config').logger
    , _ = require('underscore')
    , util = require("util");

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
var SSHConnection = function () {
    Connection.call(this);
};

util.inherits(SSHConnection, Connection);

/**
 * Get percentage swap used as a float
 * @param callback
 */
SSHConnection.prototype.swapUsedPercentage = function(callback) {
    var self = this;
    this.memoryInfo(function (err, info) {
        if (err && callback) {
            callback(err, null);
        }
        else {
            if (callback) {
                var swapFree = info[memInfoKey.SwapFree];
                var swapTotal = info[memInfoKey.SwapTotal];
                callback(null, swapTotal ? swapFree  / swapTotal : 0);
            }
        }
    })
};

/**
 * Get percentage swap used as a float
 * @param callback
 */
SSHConnection.prototype.memoryUsed = function(callback) {
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
SSHConnection.prototype.averageLoad = function (callback) {
    this.execute('uptime', function(err, data) {
        if (err) callback(err, data);
        else {
            var averages = data.split('load average:');
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

SSHConnection.prototype.cpuUsage = function (callback) {
    this.execute('top -b -d1 -n1|grep -i "Cpu(s)"|head -c21|cut -d \' \' -f3|cut -d \'%\' -f1', function (err, data) {
        if (callback) callback(err, parseFloat(data));
    });
};

/**
 * Prints /proc/meminfo to stdout and parses it into a dictionary.
 * @param callback
 */
SSHConnection.prototype.memoryInfo = function (callback) {
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

SSHConnection.prototype.execute = function(exec_str, callback) {
    var start = null;
    if (Logger.trace) start = new Date().getTime();
    var self = this;
    var connString = this._host + ':' + this._port;
    self.exec(exec_str, function (err, stream) {
        if (err && callback) {
            callback(err);
        }
        else {
            var stderr = "";
            var stdout = "";
            var exitCode  = null;
            var streamEnded = false;
            var streamCLosed = false;
            // There is no guarantee on the order of events from the stream, and we need both the exit code and the
            // all output from the stream. Therefore force respond function be executed only once.
            var respond = _.once(function () {
                if (Logger.verbose) {
                    Logger.verbose(connString + '[' + exec_str + '][STDERR]: ' + stderr);
                    Logger.verbose(connString + '[' + exec_str + '][STDOUT]: ' + stdout);
                }
                var exitWithErrorCode = exitCode > 0;
                var noOutput = stdout.length == 0;
                var isErrorState = exitWithErrorCode || noOutput;
                if (isErrorState) {
                    if (!stderr.length) stderr = 'Unknown Error (No stderr or stdout received)';
                    if (callback) callback(stderr, null);
                }
                else {
                    if (callback) callback(null, stdout);
                }
                if (Logger.trace) {
                    var end = new Date().getTime();
                    var time = end - start;
                    Logger.trace("Executing '" + exec_str + "' on " + connString + " took " + time.toString() + "ms");
                }
            });
            stream.on('data', function (data, extended) {
                var result = data.toString();
                if (extended === 'stderr') {
                    stderr = stderr + '\n' + result;
                }
                else {
                    stdout = stdout + '\n' + result;
                }
            });
            stream.on('end', function() {
                streamEnded = true;
                if (exitCode) respond();
            });
            stream.on('close', function() {
                streamCLosed = true;
            });
            stream.on('exit', function (code, signal) {
                if (streamEnded) respond();
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

SSHConnection.prototype.percentageUsed = function(path, callback) {
    percentageUsed.call(this, path, callback);
};

SSHConnection.prototype.percentageFree = function(path, callback) {
    percentageUsed.call(this, path, function(error, percentageUsed) {
        callback(error, percentageUsed ? 1 - percentageUsed : null);
    });
};


exports.SSHConnection = SSHConnection;
exports.memInfoKey = memInfoKey;