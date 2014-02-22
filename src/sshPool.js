/**
 * Created by mtford on 22/02/2014.
 */

var Logger = require('./config').logger
    , poolModule = require('generic-pool')
    , _ = require('underscore')
    , ssh = require('./ssh');

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

    this.options = options;

    _.defaults(this.options, defaultOptions);

    this.pool = poolModule.Pool({
        name     : 'ssh',
        create   : _.bind(this.spawnClient, self),
        destroy  : _.bind(this.destroyClient, self),
        max      : self.options.max,
        min      : self.options.min,
        idleTimeoutMillis : 30000,
        log : false
    });

};

SSHConnectionPool.prototype.acquire = function (callback) {
    var self = this;
    this.pool.acquire(function (err, client) {
        if (!(client instanceof ssh.SSHConnection)) throw 'Invalid client returned';
        if (err) {
            log.call(self, 'error', 'Acquisition failed - '+err);
        }
        else {
            log.call(self, 'debug', 'Acquisition succeeded. There are now ' + self.pool.availableObjectsCount() +
                '/' + self.pool.getPoolSize() + ' connections available.');
        }
        callback(err, client);
    });
};

SSHConnectionPool.prototype.release = function (client) {
    this.pool.release(client);
    log.call(this, 'debug', 'Release succeeded. There are now ' + this.pool.availableObjectsCount() +
        '/' + this.pool.getPoolSize() + ' connections available.');
};

SSHConnectionPool.prototype.spawnClient = function (callback) {
    var self = this;
    var client = new ssh.SSHConnection();
    client.on('ready', function() {
        log.call(self, 'info', 'Connection established');
        callback(null,client);
    });
    client.on('error', function(e) {
        log.call(self, 'error', e);
        callback(e,null);
    });
    client.on('end', function() {
        log.call(self, 'debug', 'Connection ended');
    });
    client.on('close', function(had_error) {
        if (had_error) log.call(self, 'info', 'Connection closed due to error');
        else log.call(self, 'info', 'Connection closed cleanly');
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

/**
 * Log host+port details as well as the message.
 * @param level
 * @param message
 */
function log(level, message) {
    message = 'SSHConnectionPool[' + this.options.host + ":" + this.options.port.toString() + "] " + message;
    Logger.log(level, message);
}

exports.SSHConnectionPool = SSHConnectionPool;