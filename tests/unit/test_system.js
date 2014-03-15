/**
 * Created by mtford on 15/03/2014.
 */
/* global describe, it, before, beforeEach, after, afterEach */

var Logger = require('../../src/config.js').logger
    , expect = require("chai").expect
    , mock = require('./mock')
    , system = require('../../src/system');

before(function () {
    mock.stubSSH();
});

/**
 * Verify initial state of the system.
 */
function assertInitialState() {
    it("should have no pools", function () {
        expect(system._pools).to.be.empty;
    });

    it("should have no monitors", function () {
        expect(system._monitors).to.be.empty;
    });

    it("should have no listeners", function () {
        expect(system._listeners).to.be.empty;
    });

    it("should have no config", function () {
        expect(system._config).to.not.be.ok;
    });

    it("should not have a db", function () {
        expect(system._db).to.not.be.ok;
    });
}

describe('Initial state', function () {
    assertInitialState();
});

describe("Started", function () {

    var config = require('../../src/config');

});