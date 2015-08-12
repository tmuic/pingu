module.exports = {
  exec: function (slack, data) {
    var matches, helpRegex = /^help[\.\!\?]*\b|\bhelp[\.\!\?]*$|^help[\.\!\?]*$/i;

    if (helpRegex.exec(data.text) !== null) {
      var channel;

      if (data.channel.substr(0, 1) === 'D') {
        slack.sendMsg(data.channel, 'Commands:\n>jira\tRetrieve information about a JIRA issue.\nTo learn more about a specific command, type `help :command`.');
        return true;
      }
    }

    return false;
  }
};
