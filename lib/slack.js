// Dependencies
var promise  = require('q');
var SlackAPI = require('slackbotapi');

// Private Variables
var connected = promise.defer();
var core;
var slack;

// Constructor
var Slack = function(pingu) {
  var _this = this;

  core  = pingu;
  slack = new SlackAPI({
    token: core.getConfig().get('slack.token'),
    logging: core.getConfig().get('slack.logging'),
  });

  slack.on('hello', function() {
    core.log('info', 'Connected to Slack as ' + _this.getPinguId() + '.');
    connected.resolve();
  });
};

// Public Methods
Slack.prototype.getPinguId = function() {
  return slack.slackData.self.id;
};

Slack.prototype.isConnected = function() {
  return connected.promise;
};

Slack.prototype.isValidMessage = function(data) {
  // Don't trigger on our own messages.
  if (data.user === this.getPinguId()) {
    return false;
  }

  // Right now we only handle messages with text.
  if (typeof data.text === 'undefined') {
    return false;
  }

  return true;
};

Slack.prototype.listen = function(callback) {
  slack.on('message', callback);
};

Slack.prototype.sendAttachments = function(channel, attachments) {
  slack.reqAPI('chat.postMessage', {
    as_user: true,
    attachments: attachments,
    channel: channel,
  });
};

Slack.prototype.sendMessage = function(channel, message) {
  slack.sendMsg(channel, message);
};

Slack.prototype.sendTypingEvent = function(channel) {
  slack.sendSock({
    type: 'typing',
    channel: channel,
  });
};

// Export
module.exports = Slack;
