var config  = require('config');
var promise = require('q');
var Zendesk = require('node-zendesk');
var zendesk = Zendesk.createClient({
  username:  config.get('zendesk.username'),
  token:     config.get('zendesk.token'),
  remoteUri: config.get('zendesk.url') + '/api/v2'
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

  zendesk.tickets.show(issueKey, function(err, req, issue) {
    if (err !== null) {
      console.log(err);
      deferred.reject(issueKey);
      return;
    }

    var message = '';

    if (issue.assignee_id !== null) {
      message += '_Assigned to_ *' + issue.assignee_id + '*';
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
      //author_icon: issue.fields.status.iconUrl,
      author_name: issue.status + ' ' + issue.type,
      //color: getStatusColor(issue.fields.status.statusCategory.colorName),
      fallback: '#' + issue.id + ': ' + issue.subject,
      pretext: '*#<https://' + config.get('zendesk.url') + '/agent/tickets/' + issue.id + '|' + issue.id + '>*: ' + issue.subject,
      mrkdwn_in: ['pretext', 'text'],
      text: message,
    });
  });

  return deferred.promise;
}

function postZendeskIssue(pingu, data, issues) {
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
  return 'Zendesk';
};

module.exports.getSchedules = function() {
  return [];
};

module.exports.getTriggers = function(pinguId) {
  return [
    {
      regex: /(?:\s|^)![zZ]([0-9]+)/g,
      command: postZendeskIssue,
      weight: 0,
    }
  ];
};
