/**
 * Created by mtford on 21/02/2014.
 */

exports.servers = [
    {
    name: 'Clarity',
    host: '188.226.141.90',
    port: 22,
    username: 'clarity',
    privateKey: '/Users/mtford/.ssh/id_rsa',
    monitoringOptions: {
        diskSpace: ['/home/']
    }
}
];
exports.dataFile = '/tmp/ssh-system-monitor/ssm.dat';
exports.rate = 1000;
exports.poolSize = 10;
exports.maintainConnections = 2;
exports.logLevel = 'info';
