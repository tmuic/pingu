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
Store.prototype.addToHash = function(hash, key, value) {
  var deferred = promise.defer();

  promise.ninvoke(redis, 'hset', hash, key, JSON.stringify(value)).then(function() {
    deferred.resolve();
  }, function() {
    deferred.reject();
  });

  return deferred.promise;
}

Store.prototype.getFromHash = function(hash, key) {
  var deferred = promise.defer();

  promise.ninvoke(redis, 'hget', hash, key).then(function(group) {
    deferred.resolve(JSON.parse(group));
  }, function() {
    deferred.reject();
  });

  return deferred.promise;
}

// Export
module.exports = Store;
