module.exports = {
  exec: function (slack, data) {
    var matches, mentionRegex = /^<@U08TS076K> /g;

    if (mentionRegex.exec(data.text) !== null) {
      slack.sendMsg(data.channel, '<@'+data.user+'>: I\'m a penguin, hun! Why are you talking to me?');
      return true;
    }

    return false;
  }
};
