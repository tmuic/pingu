// Dependencies
var config = require('config');
var Slack  = require('slackbotapi');
var Redis  = require('redis');
var cron   = require('node-schedule');

// Private Variables
var triggers = [];
var redis;
var slack;

// Private Methods
function onMessage(data) {
  // Right now we only handle messages with text.
  if (typeof data.text === 'undefined') {
    return;
  }

  triggers.forEach(function(trigger) {
    var matches = [];
    var match;
    do {
      match = trigger.regex.exec(data.text);
      if (match) {
        matches.push(match[1]);
      }
    } while (match);

    if (matches.length === 0) {
      return;
    }

    trigger.command(slack, redis, data, matches);
  });
}

// Constructor
var Pingu = function() {
  redis = Redis.createClient();
  slack = new Slack({
    token: config.get('slack.token'),
    logging: config.get('slack.logging'),
  });
};

// Public Methods
Pingu.prototype.listen = function() {
  slack.on('message', onMessage);
};

Pingu.prototype.loadPlugin = function(plugin) {
  if (typeof plugin.getTriggers !== 'function') {
    throw new Error('Unable to load plugin, missing method getTriggers().');
  }

  if (typeof plugin.getSchedules !== 'function') {
    throw new Error('Unable to load plugin, missing method getSchedules().');
  }

  plugin.getTriggers().forEach(function(trigger) {
    triggers.push(trigger);
  });

  plugin.getSchedules().forEach(function(schedule) {
    cron.scheduleJob(schedule.spec, function() {
      schedule.command(slack, redis);
    });
  });
};

// Export
module.exports = new Pingu();
