var config  = require('config');
var promise = require('q');
var JiraAPI = require('jira-connector');
var jira    = new JiraAPI({
  host: config.get('jira.host'),
  basic_auth: {
    username: config.get('jira.username'),
    password: config.get('jira.password'),
  },
});

function getStatusColor(color) {
  switch (color) {
    case 'green':
      return '#14892C';
    case 'yellow':
      return '#F6C342';
    case 'blue-gray':
      return '#4A6785';
    default:
      return '#4A6785';
  }
}

function makeIssueAttachment(issueKey) {
  var deferred = promise.defer();

  jira.issue.getIssue({
    issueKey: issueKey,
  }, function(error, issue) {
    if (error !== null) {
      deferred.reject(issueKey);
      return;
    }

    var message = '';

    if (issue.fields.assignee !== null) {
      message += '_Assigned to_ *' + issue.fields.assignee.displayName + '*';
    }

    if (issue.fields.components.length > 0) {
      message += ' _affecting_ ';

      var components = [];
      for (var i = 0; i < issue.fields.components.length; i++) {
        components.push('*' + issue.fields.components[i].name + '*');
      }

      components = [components.slice(0, -1).join(', '), components.slice(-1)[0]].join(' _and_ ');

      if (components.substr(0, 7) === ' _and_ ') {
        components = components.substr(7);
      }

      message += components;
    }

    if (message.substr(0, 3) === ' _a') {
      message = '_A' + message.substr(3);
    }

    if (message != '') {
      message += '.\n';
    }

    if (issue.fields.parent !== undefined) {
      var parent = issue.fields.parent;
      message += '_Belongs to the ' + parent.fields.issuetype.name.toLowerCase() + ' *<https://' + jira.host + '/browse/' + parent.key + '|' + parent.key + '>*: ' + parent.fields.summary + '_.';
    }

    deferred.resolve({
      author_icon: issue.fields.status.iconUrl,
      author_name: issue.fields.status.name + ' ' + issue.fields.issuetype.name,
      color: getStatusColor(issue.fields.status.statusCategory.colorName),
      fallback: issue.key + ': ' + issue.fields.summary,
      pretext: '*<https://' + jira.host + '/browse/' + issue.key + '|' + issue.key + '>*: ' + issue.fields.summary,
      mrkdwn_in: ['pretext', 'text'],
      text: message,
    });
  });

  return deferred.promise;
}

function postJiraIssue(pingu, data, issues) {
  issues.forEach(function(issue, index) {
    issues[index] = makeIssueAttachment(issue);
  });

  promise.allSettled(issues).then(function(results) {
    var attachments = [];
    var errors = [];
    results.forEach(function(result) {
      if (result.state === 'fulfilled') {
        attachments.push(result.value);
      } else {
        errors.push(result.reason);
      }
    });

    pingu.getSlack().sendAttachments(data.channel, attachments);

    if (errors.length > 0) {
      var errorMessage = [errors.slice(0, -1).join(', '), errors.slice(-1)[0]].join(' and ');

      if (errorMessage.substr(0, 5) === ' and ') {
        errorMessage = errorMessage.substr(5);
      }

      pingu.getSlack().sendMessage(data.channel, '<@' + data.user + '>: I was unable to retrieve ' + errorMessage + '.');
    }
  });
}

module.exports.getName = function() {
  return 'Jira';
};

module.exports.getSchedules = function() {
  return [];
};

module.exports.getTriggers = function(pinguId) {
  return [
    {
      regex: /(?:\s|^)!([A-Z]+-[0-9]+)/g,
      command: postJiraIssue,
      weight: 0,
    },
  ];
};
