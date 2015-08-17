// Dependencies
var config  = require('config');
var promise = require('q');
var Redis   = require('redis');

// Private Variables
var connected = promise.defer();
var core;
var redis;

// Constructor
var Store = function(pingu) {
  core = pingu;

  var host = core.getConfig().get('redis.host');
  var port = core.getConfig().get('redis.port');

  redis = Redis.createClient(port, host);

  redis.on('ready', function() {
    core.log('info', 'Connected to Redis on ' + host + ':' + port + '.');
    connected.resolve();
  });
};

// Public Methods
Store.prototype.getPinguId = function() {
  return slack.slackData.self.id;
};

// Export
module.exports = Store;
