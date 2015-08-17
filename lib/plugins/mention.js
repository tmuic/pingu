function replyToMention(pingu, data) {
  pingu.getSlack().sendMessage(data.channel, '<@' + data.user + '>: Noot Noot!');
}

module.exports.getName = function() {
  return 'Mention';
};

module.exports.getSchedules = function() {
  return [];
};

module.exports.getTriggers = function(pinguId) {
  return [
    {
      regex: new RegExp('^<@' + pinguId + '>', 'g'),
      command: replyToMention,
      weight: 10,
    },
  ];
};
