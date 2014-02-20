ssh-system-monitor
==================

A node.js application capable of monitoring multiple servers over ssh e.g. memory, cpu usage, swap usage, disk space. Information is collected into an [nedb](https://github.com/louischatriot/nedb) instance and ssh pooling is used for efficiency.

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

### Configuration

See config.js

#### Servers

Add as many `servers` as you would like e.g.

```javascript
var servers = [{
    name: 'My Server', // Identify the server
    host: '36.41.141.85',
    port: 22,
    username: 'ubuntu',
    privateKey: '/path/to/privateKey.pem',
    monitoringOptions: {
        swap: True,
        cpu: True,
        memory: True,
        diskSpace: ['/home/ubuntu/', '/mnt']
    }
}];
```

#### Data

Specify the data directory i.e. the location that the nedb database will be stored:

```javascript
var dataFile = '/tmp/ssh-system-monitor/ssm.dat';
```

#### SSH

It's also possible to configure the maximum num. of SSH connections that can be pooled for each server and minimum num. to be maintained:

```javascript
var poolSize = 10;
var maintainConnections = 2;
```

### Analytics

Once you have an nedb you can perform your own analysis or use the built in e.g.

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
