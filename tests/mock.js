/**
 * Created by mtford on 20/02/2014.
 */

var sinon =  require('sinon'),
    ssh = require('../src/ssh'),
    pool = require('../src/sshPool'),
    _ = require('underscore');


var sandbox;

/**
 * Stub SSH connections with sane return values.
 */
function stubSSH() {

    function successfulCallback(val, timeout, callback) {
        setTimeout(function () {
            if (callback) callback(null, val);
        }, timeout);
    }

    // TODO: Gotta be a way to combine the above? YEP! Change to a sinon yield
    function successfulCallbackPath(val, timeout, path, callback) {
        setTimeout(function () {
            if (callback) callback(null, val);
        }, timeout);
    }

    if (!sandbox) {

        sandbox = sinon.sandbox.create();

        sandbox.stub(ssh.SSHConnection.prototype, 'swapUsedPercentage', _.partial(successfulCallback, 0.83, 0.2));
//    sandbox.stub(ssh.SSHConnection.prototype, 'swapUsedPercentage', _.partial(successfulCallback, 0.83, 0.2));
        sandbox.stub(ssh.SSHConnection.prototype, 'memoryUsed', _.partial(successfulCallback, 0.83, 0.2));
        sandbox.stub(ssh.SSHConnection.prototype, 'cpuUsage', _.partial(successfulCallback, 0.83, 0.2));
        sandbox.stub(ssh.SSHConnection.prototype, 'averageLoad', _.partial(successfulCallback, {
            1:0.4,
            5:0.23,
            15:0.53
        }, 0.2));
        sandbox.stub(ssh.SSHConnection.prototype, 'percentageUsed', _.partial(successfulCallbackPath, 0.83, 0.2));
        sandbox.stub(ssh.SSHConnection.prototype, 'percentageFree', _.partial(successfulCallbackPath, 0.83, 0.2));

        sandbox.stub(ssh.SSHConnection.prototype, 'memoryInfo', function (callback) {
            var response = {};
            var memInfoKey = ssh.memInfoKey;
            for (var key in  memInfoKey) {
                response[memInfoKey[key]] = Math.floor((Math.random()*100)+1);
            }
            setTimeout(function () {
                if (callback) callback(null, response);
            }, 0.2);
        });

        sandbox.stub(pool.SSHConnectionPool.prototype, 'spawnClient', function (callback) {
            var client = new ssh.SSHConnection();
            callback(null, client);
        });
        sandbox.stub(pool.SSHConnectionPool.prototype, 'destroyClient', function () {
        });

    }


}

exports.stubSSH = stubSSH;
exports.clearSSHStubs = function () {
    if (sandbox) {
        sandbox.restore();
        sandbox = null;
    }
};