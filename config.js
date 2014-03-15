/*
   This config file hooks up to the vagrant virtual machines specified in
   the Vagrantfile. Useful for integration testing.
*/

var exec = require('exec-sync');

identityFileConfig = 'vagrant ssh-config precise64 | grep IdentityFile';
privateKey = exec(identityFileConfig).split(' ').slice(-1).pop();
username = 'vagrant';

exports.servers = [{
    name: 'precise64',
    host: '192.168.50.2',
    username: username,
    privateKey: privateKey
},{
    name: 'debian64',
    host: '192.168.50.3',
    username: username,
    privateKey: privateKey
},{
    name: 'centos64',
    host: '192.168.50.5',
    username: username,
    privateKey: privateKey
}];

exports.dataFile = '/tmp/ssh-system-monitor/ssm.dat';
exports.rate = 1000;
exports.poolSize = 10;
exports.maintainConnections = 2;
exports.logLevel = 'info';
