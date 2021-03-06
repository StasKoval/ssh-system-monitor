/**
 * Created by mtford on 22/02/2014.
 */

var config = require('./config')
    , Logger = require('./config').logger
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
        port: 22,
        username: '',
        privateKey: null,
        max: 10,
        min: 2
    };

    this.options = options ? options : {};

    _.defaults(this.options, defaultOptions);

    this.pool = poolModule.Pool({
        name     : 'ssh',
        create   : _.bind(this.spawnClient, self),
        destroy  : _.bind(this.destroyClient, self),
//        validate : _.bind(this.validate, self),
        max      : self.options.max,
        min      : self.options.min,
        idleTimeoutMillis : 30000,
        log : false
    });

};

SSHConnectionPool.prototype.acquire = function (callback) {
    var self = this;
    var tp = setTimeout(function () {
        tp = null;
        var message = 'Acquisition timed out';
        if (Logger.debug) {
            Logger.error(self.logMessage(message))
        }
        if (callback) callback(message);
    }, config.timeouts.acquisition);
    this.pool.acquire(function (err, client) {
        if (err) {
            Logger.error(self.logMessage('Acquisition failed - '+err));
        }
        else {
            if (!(client instanceof ssh.SSHConnection)) throw 'Invalid client returned';
            if (Logger.verbose) {
                var message = 'Acquisition succeeded. There are now ' + self.pool.availableObjectsCount() +
                    '/' + self.pool.getPoolSize() + ' connections available.';
                Logger.verbose(self.logMessage(message));
            }
        }
        if (tp) {
            clearTimeout(tp);
            callback(err, client);
        }
    });
};

SSHConnectionPool.prototype.release = function (client) {
    if (client) {
        this.pool.release(client);
    }
    else {
        Logger.warn('Attempted to release a null client...');
    }
    if (Logger.verbose) {
        var message = 'Release succeeded. There are now ' + this.pool.availableObjectsCount() +
            '/' + this.pool.getPoolSize() + ' connections available.';
        Logger.verbose(this.logMessage(message))
    }
};

SSHConnectionPool.prototype.spawnClient = function (callback) {
    var self = this;
    var client = new ssh.SSHConnection();
    client.on('ready', function() {
        if (Logger.info) Logger.info(self.logMessage('Connection established'));
        callback(null,client);
    });
    client.on('error', function(e) {
        if (Logger.error) Logger.error(self.logMessage(e));
        callback(e,client);
    });
    client.on('end', function() {
        if (Logger.debug) Logger.debug(self.logMessage('Connection ended'));
    });
    client.on('close', function(had_error) {
        if (had_error) Logger.error(self.logMessage('Connection closed due to error'));
        else if (Logger.info) Logger.info(self.logMessage('Connection closed cleanly'));
    });
//    var socket = new Socket();
//    socket.setNoDelay(true);
//    socket.setMaxListeners(0);
//    socket.connect(this.options.host, this.options.port);
    client.connect({
        host: this.options.host,
        port: this.options.port,
        username: this.options.username,
        privateKey: this.options.privateKey,
        password: this.options.password
//        sock: socket
    });
    return client;
};

//SSHConnectionPool.prototype.validate = function (client) {
//    return client._state != 'closed'; // Connection will be destroyed if not open. Allows for error recovery.
//};

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
        if (client) self.release(client);
    });
};

SSHConnectionPool.prototype.toString = function() {
    return 'Pool<' + this.options.host + ':' + this.options.port.toString() + '>';
};

/**
 * Log host+port details as well as the message.
 * @param message
 */
SSHConnectionPool.prototype.logMessage = function(message) {
    var host = this.options.host;
    var port = this.options.port ? this.options.port : "";
    message = 'SSHConnectionPool[' + host + ":" + port.toString() + "] " + message;
    return message;
};

exports.SSHConnectionPool = SSHConnectionPool;