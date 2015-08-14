// Dependencies
var config = require('config');
var Slack  = require('slackbotapi');
var Redis  = require('redis');
var cron   = require('node-schedule');

// Private Variables
var triggers = [];
var redis;
var slack;
var BreakException = {};

// Private Methods
function onMessage(data) {
  // Don't trigger on our own messages.
  if (data.user === slack.slackData.self.id) {
    return;
  }

  // Right now we only handle messages with text.
  if (typeof data.text === 'undefined') {
    return;
  }

  triggers = triggers.sort(function(a, b) {
    var x = a.weight;
    var y = b.weight;
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });

  try {
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

      slack.sendSock({
        type: 'typing',
        channel: data.channel,
      });
      trigger.command(slack, redis, data, matches);
      throw BreakException;
    });
  } catch (e) {
    if (e !== BreakException) {
      throw e;
    }
  }
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
