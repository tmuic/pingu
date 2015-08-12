module.exports = {
  exec: function (slack, data) {
    var matches, mentionRegex = /^<@U08TS076K>/g;

    if (mentionRegex.exec(data.text) !== null) {
      slack.sendMsg(data.channel, '<@'+data.user+'>: Noot Noot!');
      return true;
    }

    return false;
  }
};
