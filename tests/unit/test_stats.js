/**
 * Created by mtford on 08/02/2014.
 */
/*global describe, it, before, beforeEach, after, afterEach */

var Logger = require('../../src/config').logger
    , expect = require("chai").expect
    , config = require('../../src/config')
    , nedb =  require('nedb')
    , mock = require('./mock')
    , monitor = require('../../src/monitor')
    , listener = require('../../src/listener')
    , pool = require('../../src/pool')
    , analytics = require('../../src/analytics');

var sshConnPool;
var statsMonitor;

const REGEX_FLOAT_OR_INT = /^[0-9]*([.][0-9]+)?$/;


before(function () {
    mock.stubSSH();
    sshConnPool = new pool.SSHConnectionPool({});
    statsMonitor = new monitor.StatsMonitor(sshConnPool, ['/home/']);
    statsMonitor.start();
});

describe ('StatsMonitor', function () {

    this.timeout(6000);

    it("tests emits swapUsed", function (done) {
        Logger.verbose("Testing emits swapUsed");
        statsMonitor.once('swapUsed', function(cpuUsage) {
            expect(cpuUsage).to.match(REGEX_FLOAT_OR_INT);
            Logger.verbose("Tested emits swapUsed");
            done();
        });

    });

    it("tests emits cpuUsage", function (done) {
        statsMonitor.once('cpuUsage', function(cpuUsage) {
            expect(cpuUsage).to.match(REGEX_FLOAT_OR_INT);
            done();
        });
    });

    it("tests emits memoryUsage", function (done) {
        statsMonitor.once('memoryUsed', function(memoryUsed) {
            expect(memoryUsed).to.match(REGEX_FLOAT_OR_INT);
            done();
        });
    });

    it("tests emits diskSpaceUsed", function (done) {
        statsMonitor.once('diskSpaceUsed', function(diskSpaceUsed) {
            expect(diskSpaceUsed).to.have.property('/home/');
            expect(diskSpaceUsed['/home/']).to.match(REGEX_FLOAT_OR_INT);
            done();
        });
    });

});

describe("Statistic Collection & Analysis", function () {

    this.timeout(6000);

    var db;
    var statsListener;
    var types = config.statTypes;

    before(function (done) {
        Logger.debug(new Date().toString());
        Logger.info('Creating in memory db');
        db = new nedb(); // In memory nedb.
        statsListener = new listener.NedbStatsListener(db, statsMonitor);
        Logger.debug(new Date().toString());
        done();

    });

    describe("NedbStatsListener", function () {

        /**
         * Take documents returned from nedb and verify NedbStatsListener is populating correctly
         * @param docs
         */
        function verifyDocs(docs) {
            expect(docs).to.have.length.above(0);
            Logger.info('db has docs: ', docs);
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];
                expect(doc).to.have.ownProperty('host');
                expect(doc).to.have.ownProperty('value');
                expect(doc).to.have.ownProperty('type');
                expect(doc).to.have.ownProperty('date');
            }
        }

        it("tests captures swapUsed", function (done) {
            statsMonitor.once('swapUsed', function() {
                db.find({type: types.swapUsed}, function(err, docs) {
                    expect(err).to.not.be.ok;
                    verifyDocs(docs);
                    done();
                });
            })
        });

        it("tests captures cpuUsage", function (done) {
            statsMonitor.once('cpuUsage', function() {
                db.find({type: types.cpuUsage}, function(err, docs) {
                    expect(err).to.not.be.ok;
                    verifyDocs(docs);
                    done();
                });
            });
        });


        it("tests captures memoryUsed", function (done) {
            statsMonitor.once('memoryUsed', function() {
                db.find({type: types.memoryUsed}, function(err, docs) {
                    expect(err).to.not.be.ok;
                    verifyDocs(docs);
                    done();
                });
            });
        });

        it("tests captures disk usage", function (done) {
            statsMonitor.once('diskSpaceUsed', function() {
                db.find({type: types.diskSpaceUsed}, function(err, docs) {
                    expect(err).to.not.be.ok;
                    verifyDocs(docs);
                    for (var i=0;i<docs.length;i++) {
                        var doc = docs[i];
                        expect(doc).to.have.ownProperty('path');
                    }
                    done();
                });
            });
        });

    });

    describe("Analytics", function () {

        var a;

        before(function (done) {
            a = new analytics.Analytics(db);
            setTimeout(function () { // Let some stats build up in the db.
                done();
            }, 3000);
        });

        describe("date ranges", function () {

            function validateResults(results) {
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    expect(result).to.have.property('date');
                    expect(result.date).to.be.an.instanceOf(Date);
                    expect(result).to.have.property('value');
                    expect(result.value).to.match(REGEX_FLOAT_OR_INT);
                }
            }

            describe("no date specified", function () {

                it("cpuUsage", function (done) {
                    a.cpuUsage(null, null, function(err, results) {
                        expect(err).to.not.be.ok;
                        expect(results).to.have.length.above(0);
                        validateResults(results);
                        done();
                    });
                });

                it("swapUsage", function (done) {
                    a.swapUsage(null, null, function(err, results) {
                        expect(err).to.not.be.ok;
                        expect(results).to.have.length.above(0);
                        validateResults(results);
                        done();
                    });
                });

                it("memoryUsage", function (done) {
                    a.memoryUsage(null, null, function(err, results) {
                        expect(err).to.not.be.ok;
                        expect(results).to.have.length.above(0);
                        validateResults(results);
                        done();
                    });
                });

                it("meanCpuUsage", function (done) {
                    a.meanCpuUsage(null, null, function (err, result) {
                        expect(err).to.not.be.ok;
                        expect(result).to.match(REGEX_FLOAT_OR_INT);
                        done();
                    });
                });

            });

            describe("date specified", function () {

                //noinspection JSPotentiallyInvalidUsageOfThis
                this.timeout(12000);

                var startDate;
                var endDate;

                before(function (done) {
                    startDate = new Date();
                    a = new analytics.Analytics(db);
                    setTimeout(function () { // Let some stats build up in the db.
                        endDate = new Date();
                        setTimeout(function () { // Let some other stats build up.
                            done();
                        }, 3000);
                    }, 3000);
                });

                it("cpuUsage", function (done) {
                    a.cpuUsage(startDate, endDate, function(err, results) {
                        expect(err).to.not.be.ok;
                        expect(results).to.have.length.above(0);
                        validateResults(results);
                        validateDatesOfResults(results);
                        done();
                    });
                });

                function validateDatesOfResults(results) {
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        expect(result.date).to.be.at.most(endDate);
                        expect(result.date).to.be.at.least(startDate);
                    }
                }

                it("swapUsage", function (done) {
                    a.swapUsage(startDate, endDate, function(err, results) {
                        expect(err).to.not.be.ok;
                        expect(results).to.have.length.above(0);
                        validateResults(results);
                        validateDatesOfResults(results);
                        done();
                    });
                });


                it("memoryUsage", function (done) {
                    a.memoryUsage(startDate, endDate, function(err, results) {
                        expect(err).to.not.be.ok;
                        expect(results).to.have.length.above(0);
                        validateResults(results);
                        validateDatesOfResults(results);
                        done();
                    });
                });

                it("meanCpuUsage", function (done) {
                    a.meanCpuUsage(startDate, endDate, function (err, result) {
                        expect(err).to.not.be.ok;
                        expect(result).to.match(REGEX_FLOAT_OR_INT);
                        done();
                    });
                });

            });

        });

        describe("other", function () {

        });

    });

});

after(function (done) {
    Logger.info('Draining SSH pool');
    statsMonitor.stop();
    sshConnPool.drain(done);
});