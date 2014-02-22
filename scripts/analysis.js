/**
 * Created by mtford on 21/02/2014.
 */

var Nedb = require('nedb')
    , db = new Nedb({ filename: require('../src/config').dataFile, autoload: true })
    , analytics = require('../src/analytics').Analytics(db);

// Print mean CPU usage for all data points
analytics.meanCpuUsage(null, null, function(err, result) {
    if (!err) process.stdout.write('Mean CPU usage is: ' + result.toString() + '\n');
    else process.stdout.write('Error getting mean CPU Usage:' + err + '\n');
});

// Print all swap usage data points
analytics.swapUsage(null, null, function(err, results) {
    if (!err) {
        process.stdout.write('Have ' + results.length.toString() + ' swap usage data points\n');
    }
    else process.stdout.write('Error getting swap Usage:' + err + '\n');
});

// Print all CPU usage data points
analytics.cpuUsage(null, null, function(err, results) {
    if (!err) {
        process.stdout.write('Have ' + results.length.toString() + ' cpu usage data points\n');
    }
    else process.stdout.write('Error getting CPU Usage:' + err + '\n');
});

//// Print all memory usage data points
//analytics.memoryUsage(null, null, function(err, results) {
//    if (!err) {
//        for (var i=0; i<results.length; i++) {
//            var result = results[i];
//            process.stdout.write('Memory usage at ' + result.date + ':' + result.value.toString() + '\n')
//        }
//    }
//    else process.stdout.write('Error getting Memory Usage:' + err + '\n');
//});