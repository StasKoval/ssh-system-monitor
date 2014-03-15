

/* global describe, it, before, beforeEach, after, afterEach */

var expect = require("chai").expect
    , system = require('../../src/system')
    , config = require('../../src/config')
    , logger = config.logger
    , Nedb =  require('nedb');

describe('Integration Tests', function () {
    /*
    Tests against whatever is configured in config.js for now. Good for quickly checking that all is well.
     */

    var db = new Nedb();
    var testLength = 5000;

    before(function () {
        system.start(config, db);
    });

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

});