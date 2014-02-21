ssh-system-monitor
==================

A node.js application capable of monitoring multiple servers over ssh e.g. memory, cpu usage, swap usage, disk space. Information is collected into an [nedb](https://github.com/louischatriot/nedb) instance and ssh pooling is used for efficiency.

NOTE: This app has been adapted from the [clarity](https://github.com/mtford90/clarity) codebase for demonstration purposes.

* [Install](#install)  
* [Configuration](#configuration)  
    * [Servers](#servers)
    * [Data](#data)
    * [SSH](#ssh)
* [Analytics](#analytics)
* [Testing](#testing)

<a name="headers"/>
## Headers
### Requirements

Tested with node v0.10.22

### Install

```bash
git clone https://github.com/mtford90/ssh-system-monitor .
cd ssh-system-monitor
npm install
cp config.example.js config.js
```

### Run

First modify config.js to suit your needs and then:

```bash
cd /path/to/ssh-system-monitor
npm start
```

Note, you can run some basic analysis on the configured database by running:

```bash
npm analysis
```

### Configuration

See config.js

#### Servers

Add as many `servers` as you would like e.g.

```javascript
exports.servers = [{
   name: 'A password protected server',
   host: '35.41.164.53',
   username: 'bob',
   password: 'bobsPassword'
},
{
    name: 'A key protected server',
    host: '36.41.141.85',
    port: 23,
    username: 'ubuntu',
    privateKey: '/path/to/privateKey.pem',
    monitoringOptions: {
        diskSpace: ['/home/ubuntu/', '/mnt']
    }
}];
```

#### Data

Specify the data directory i.e. the location that the nedb database will be stored:

```javascript
exports.dataFile = '/tmp/ssh-system-monitor/ssm.dat';
```

Specify the rate at which to take data points

```javascript
exports.rate = 1000;
```

#### SSH

It's also possible to configure the maximum num. of SSH connections that can be pooled for each server and minimum num. to be maintained:

```javascript
exports.poolSize = 10;
exports.maintainConnections = 2;
```

### Analytics

Once you have an nedb you can perform your own analysis or use the built in such 

```javascript
var Nedb = require('nedb')
  , db = new Nedb({ filename: require('./config').dataFile, autoload: true });
  , analytics = require('./historical').Analytics(db);

// Print mean CPU usage for all data points
analytics.meanCpuUsage(null, null, function(err, result) {
    if (!err) process.stdout.write('Mean CPU usage is: ' + result.toString() + '\n');
    else process.stdout.write('Error getting mean CPU Usage:' + err + '\n');
}

// Print all swap usage data points
analytics.swapUsage(null, null, function(err, results) {
    if (!err) {
        for (var i=0; i<results.length; i++) {
            var result = results[i];
            process.stdout.write('Swap usage at ' + result.date + ':' + result.value.toString() + '\n')
        }
    }
    else process.stdout.write('Error getting swap Usage:' + err + '\n');
};

// Print all CPU usage data points
analytics.cpuUsage(null, null, function(err, results) {
    if (!err) {
        for (var i=0; i<results.length; i++) {
            var result = results[i];
            process.stdout.write('CPU usage at ' + result.date + ':' + result.value.toString() + '\n')
        }
    }
    else process.stdout.write('Error getting CPU Usage:' + err + '\n');
};

// Print all memory usage data points
analytics.memoryUsage(null, null, function(err, results) {
    if (!err) {
        for (var i=0; i<results.length; i++) {
            var result = results[i];
            process.stdout.write('Memory usage at ' + result.date + ':' + result.value.toString() + '\n')
        }
    }
    else process.stdout.write('Error getting Memory Usage:' + err + '\n');
};

```

### Testing

If `integrationTestServer` is specified in config.js, tests will be applied against that server, otherwise the SSH connections will be mocked and will instead be ran as unit tests.

```bash
npm test
```
