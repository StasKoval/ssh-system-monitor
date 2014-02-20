/**
 * Created by mtford on 20/02/2014.
 */

var sinon =  require('sinon'),
    ssh = require('../src/ssh'),
    _ = require('underscore');

/**
 * Stub SSH connections with sane return values.
 */
function stubSSH() {

    function successfulCallback(val, timeout, callback) {
        setTimeout(function () {
            if (callback) callback(null, val);
        }, timeout);
    }

    // TODO: Gotta be a way to combine the above?
    function successfulCallbackPath(val, timeout, path, callback) {
        setTimeout(function () {
            if (callback) callback(null, val);
        }, timeout);
    }

    sinon.stub(ssh.VisionConnection.prototype, 'swapUsedPercentage', _.partial(successfulCallback, 0.83, 0.2));
    sinon.stub(ssh.VisionConnection.prototype, 'memoryUsed', _.partial(successfulCallback, 0.83, 0.2));
    sinon.stub(ssh.VisionConnection.prototype, 'averageLoad', _.partial(successfulCallback, {
        1:0.4,
        5:0.23,
        15:0.53
    }, 0.2));
    sinon.stub(ssh.VisionConnection.prototype, 'percentageUsed', _.partial(successfulCallbackPath, 0.83, 0.2));
    sinon.stub(ssh.VisionConnection.prototype, 'percentageFree', _.partial(successfulCallbackPath, 0.83, 0.2));

//    sinon.stub(ssh.SSHConnectionPool.prototype, 'spawnClient', function (callback) {
//        var client = new ssh.VisionConnection();
//        callback(null, client);
//    });

}

exports.stubSSH = stubSSH;