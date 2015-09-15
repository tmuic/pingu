function disconnect() {
  clearTimeout(pingTimer);
}

function message(data) {
  process.stdout.write(JSON.stringify({
    type: 'message',
    payload: data,
  }) + '\n');
}

function ping() {
  slack.sendSock({
    type: 'ping',
    time: Date.now(),
  });

  pingTimer = setTimeout(ping, 60000);
}

function pong(data) {
  process.stdout.write(JSON.stringify({
    type: 'latency',
    payload: {
      ping: (Date.now() - data.time),
    },
  }) + '\n');
}

if (process.argv[2] === undefined) {
  throw new Error('Missing Slack API token in arguments list');
}

var pingTimer;
var SlackAPI = require('slackbotapi');
var slack    = new SlackAPI({
  token: process.argv[2],
  logging: false,
});

slack.on('hello', ping);
slack.on('pong', pong);
slack.on('disconnect', disconnect);
slack.on('message', message);
