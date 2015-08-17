// Dependencies
var config  = require('config');
var Slack   = require('./slack');
var Store   = require('./store');
var cron    = require('node-schedule');
var logger  = require('jethro');

// Private Variables
var pingu;
var slack;
var store;
var triggers = [];

// Private Methods
function log(severity, message) {
  if (severity !== 'debug' || config.get('debug') === true) {
    logger(severity, 'Pingu', message);
  }
}

function onMessage(data) {
  // Make sure we don't trigger on something we don't want to.
  if (slack.isValidMessage(data) === false) {
    return;
  }

  var BreakException = {};

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

      // Return if no matches were found for this trigger.
      if (matches.length === 0) {
        return;
      }

      if (typeof trigger.regex === RegExp) {
        log('info', 'Received message matching "' + trigger.regex.toString()  + '".');
      } else {
        log('info', 'Received message matching "' + trigger.regex  + '".');
      }

      slack.sendTypingEvent(data.channel);
      trigger.command(pingu, data, matches);
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
  log('info', 'Noot Noot! Welcome to Pingu 1.0-dev!');

  slack = new Slack(this);
  store = new Store(this);
};

// Public Methods
Pingu.prototype.getConfig = function() {
  return config;
};

Pingu.prototype.getSlack = function() {
  return slack;
};

Pingu.prototype.getStore = function() {
  return store;
};

Pingu.prototype.listen = function() {
  slack.listen(onMessage);
};

Pingu.prototype.loadPlugin = function(plugin) {
  var _this = this;

  if (typeof plugin.getName !== 'function') {
    log('warning', 'Unable to load unknown plugin.');
  }

  if (typeof plugin.getTriggers !== 'function') {
    log('warning', 'Unable to load plugin "' + plugin.getName() + '".');
    return;
  }

  if (typeof plugin.getSchedules !== 'function') {
    log('warning', 'Unable to load plugin "' + plugin.getName() + '".');
    return;
  }

  // We need to wait for Slack to connect so we can retrieve Pingu's ID.
  slack.isConnected().then(function() {
    log('info', 'Plugin "' + plugin.getName() + '" loaded.');
    plugin.getTriggers(slack.getPinguId()).forEach(function(trigger) {
      triggers.push(trigger);
    });

    // Sort all registered triggers after weight.
    triggers = triggers.sort(function(a, b) {
      var x = a.weight;
      var y = b.weight;
      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });

    plugin.getSchedules().forEach(function(schedule) {
      cron.scheduleJob(schedule.spec, function() {
        log('info', 'Running scheduled command.');
        schedule.command(_this);
      });
    });
  });
};

Pingu.prototype.log = log;

// Export
module.exports = pingu = new Pingu();
