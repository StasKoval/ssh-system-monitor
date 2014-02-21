/**
 * Created by mtford on 21/02/2014.
 */

exports.servers = [{
    name: 'MosaycDev',
    host: '46.51.201.85',
    port: 22,
    username: 'ubuntu',
    privateKey: '/Users/mtford/Dropbox/Drake/Server-Side/dev.pem',
    monitoringOptions: {
        diskSpace: ['/home/ubuntu/', '/mnt']
    }
}];
exports.dataFile = '/tmp/ssh-system-monitor/ssm.dat';
exports.rate = 1000;
exports.poolSize = 10;
exports.maintainConnections = 2;
exports.logLevel = 'info';