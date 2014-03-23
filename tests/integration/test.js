

/* global describe, it, before, beforeEach, after, afterEach */

var expect = require("chai").expect
    , system = require('../../src/system')
    , config = require('../../src/config')
    , logger = config.logger
    , Nedb =  require('nedb')
    , _ = require('underscore');

function analyseDocuments(docs) {
    var i, doc;
    var analysis = {
        occur:{}
    };
    for (i=0; i<docs.length; i++) {
        doc = docs[i];
        if (!(doc.host in analysis.occur)) {
            analysis.occur[doc.host] = 1;
        }
        else {
            analysis.occur[doc.host]++;
        }
    }
    var hosts = _.pluck(config.servers, 'host');
    var total = _.reduce(Object.keys(analysis.occur), function(memo, key) {
        return memo + analysis.occur[key]
    }, 0);
    var occurances = _.map(hosts, function(host) {
        var occur = analysis.occur[host];
        return occur ? occur : 0;
    });
    var percentages = _.map(occurances, function(x) {
        return (100 * (x/total)).toFixed(2).toString() + '%';
    });
    process.stdout.write('\n==================\n');
    process.stdout.write(  '  Begin Analysis  \n');
    process.stdout.write(  '==================\n\n');
    process.stdout.write(  'Data points: \n');
    _.each(_.zip(hosts, occurances), function(tuple) {
        process.stdout.write('  * ' + tuple[0] + ' => ' + tuple[1] + '\n');
    });
    process.stdout.write('\n');
    process.stdout.write(  'Data point ratio: \n');
    _.each(_.zip(hosts, percentages), function(tuple) {
        process.stdout.write('  * ' + tuple[0] + ' => ' + tuple[1] + '\n');
    });
    process.stdout.write('\n==================\n');
    process.stdout.write(  '   End Analysis   \n');
    process.stdout.write(  '==================\n\n');
}

describe('Integration Tests', function () {
    /*
    Tests against whatever is configured in config.js for now. Good for quickly checking that all is well.
     */

    var db = new Nedb();
    var testLength = 60000;

    before(function () {
        system.start(config, db);
    });

    this.timeout(testLength*2);

    it("should have something in the database", function (done) {
        setTimeout(function() {
            db.find({}, function(err, docs) {
                expect(err).to.not.be.ok;
                logger.info('Docs are ', docs);
                expect(docs).to.have.length.greaterThan(1);
            });
            done();
        }, testLength);
    });

    after(function (done) {
        db.find({}, function(err, docs) {
            if (docs.length) {
                analyseDocuments(docs);
            }
            system.terminate(function () {
                done();
            });
        });
    });

});