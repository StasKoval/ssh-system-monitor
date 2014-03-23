/**
 * Takes the root config and extends with internal configuration + some massaging.
 */

var config = require('../config')
    , Winston = require('winston')
    , _ = require('underscore');

(function () {

    _.defaults(exports, config); // Import the root configuration.

    _.defaults(exports, { // Fill in the gaps
        servers: [],
        dataFile: '/tmp/ssh-system-monitor/ssm.dat',
        rate: 1000,
        poolSize: 10,
        maintainConnections: 2,
        logLevel: 'info'
    });

    exports.serverDefaults = {
        name: null,
        host: null,
        port: null,
        username: null,
        password: null,
        privateKey: null,
        monitoringOptions: {
            diskSpace: []
        }
    };

    var Logger = new (Winston.Logger)({
        levels: {
            verbose: 0,
            trace : 1,
            debug: 2,
            info: 3,
            warn: 4,
            error: 5,
            fatal: 6
        },
        colors: {
            verbose: 'grey',
            trace: 'white',
            debug: 'green',
            info: 'green',
            warn: 'yellow',
            error: 'red',
            fatal: 'red'
        },
        transports: [
            new (Winston.transports.Console)({
                json: false,
                timestamp: true,
                level: exports.logLevel,
                prettyPrint: true,
                colorize: true,
                silent: false
            })
        ],
        exitOnError: false
    });

    _.each(Object.keys(Logger.levels), function(level) {
        var oldLogger = Logger[level];
        Logger[level] = function (msg) {
            var fileAndLine = traceCaller(1);
            return oldLogger.call(this, msg + ' [' + fileAndLine + ']');
        };
    });

    function traceCaller(n) {
        if( isNaN(n) || n<0) n=1;
        n+=1;
        var s = (new Error()).stack
            , a=s.indexOf('\n',5);
        while(n--) {
            a=s.indexOf('\n',a+1);
            if( a<0 ) { a=s.lastIndexOf('\n',s.length); break;}
        }
        var b=s.indexOf('\n',a+1); if( b<0 ) b=s.length;
        a=Math.max(s.lastIndexOf(' ',b), s.lastIndexOf('/',b));
        b=s.lastIndexOf(':',b);
        s=s.substring(a+1,b);
        return s;
    }

    exports.logger = Logger;

    processServers();

    exports.statTypes = {
        cpuUsage: 'cpuUsage',
        swapUsed: 'swapUsed',
        diskSpaceUsed: 'diskSpaceUsed',
        memoryUsed: 'memoryUsed'
    };

    exports.timeouts = {
        acquisition: 500
    };

    /**
     * Merge with the default server options and read any private key files.
     */
    function processServers() {
        for (var i = 0; i < exports.servers.length; i++) {
            var server = exports.servers[i];
            _.defaults(server, exports.serverDefaults);
            if (server.hasOwnProperty('privateKey')) {
                try {
                    server.privateKey = require('fs').readFileSync(server.privateKey).toString();
                }
                catch (err) {
                    Logger.error('Unable to load private key at ' + server.privateKey,err);
                    server.privateKey = ''; // We will try without the private key anyway. This is more for sake of TravisCI
                }
            }
        }
    }

})();



