module.exports = {
  exec: function (slack, data) {
    var matches, helpRegex = /^<@U08TS076K> help$/g;

    if (helpRegex.exec(data.text) !== null) {
      var channel;

      if (data.channel.substr(0, 1) === 'D') {
        channel = data.channel;
      } else {
        channel = data.user;
      }

      slack.sendMsg(channel, 'Sorry, I can\'t help you! My flippers can only retrieve JIRA issues for now, but in the future I hope I can do lots of other cool things!');

      if (data.channel !== channel) {
        slack.sendMsg(data.channel, '<@'+data.user+'>: I DM\'d you! ;)');
      }

      return true;
    }

    return false;
  }
};
