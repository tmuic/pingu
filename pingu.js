var config     = require('config');
var requireDir = require('require-dir');
var slackAPI   = require('slackbotapi');
var plugins    = requireDir('./plugins');

// Starting
var slack = new slackAPI({
	'token': config.get('slack.token'),
	'logging': config.get('slack.logging')
});

// Slack on EVENT message, send data.
slack.on('message', function(data) {
  // If no text, return.
	if (typeof data.text == 'undefined') {
      return;
  }

  var didSendMessage = false;

  for (var plugin in plugins) {
    if (plugins.hasOwnProperty(plugin)) {
      didSendMessage = plugins[plugin].exec(slack, data);

      if (didSendMessage === true) {
        break;
      }
    }
  }
});
