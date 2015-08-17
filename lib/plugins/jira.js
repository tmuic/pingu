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

      components = [components.slice(0, -1).join('_,_ '), components.slice(-1)[0]].join(' _and_ ');

      if (components.substr(0, 7) === ' _and_ ') {
        components = components.substr(7);
      }

      message += components;
    }

    if (message.substr(0, 3) === ' _a') {
      message = '_A' + message.substr(3);
    }

    message += '.';

    if (issue.fields.parent !== undefined) {
      var parent = issue.fields.parent;
      message += '\n_Belongs to the ' + parent.fields.issuetype.name.toLowerCase() + ' *<' + jira.host + '/browse/' + parent.key + '|' + parent.key + '>*: ' + parent.fields.summary + '_.';
    }

    deferred.resolve({
      author_icon: issue.fields.status.iconUrl,
      author_name: issue.fields.status.name + ' ' + issue.fields.issuetype.name,
      color: getStatusColor(issue.fields.status.statusCategory.colorName),
      fallback: issue.key + ': ' + issue.fields.summary,
      pretext: '*<' + jira.host + '/browse/' + issue.key + '|' + issue.key + '>*: ' + issue.fields.summary,
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

function postSprintStatus(pingu) {
  promise.ninvoke(redis, 'lrange', 'jirastatus', 0, -1).then(function(statuses) {
    if (statuses.length === 0) {
      return;
    }

    statuses.forEach(function(status) {
      status = JSON.parse(status);

      var options = {
        uri: jira.buildURL('/sprintquery/' + status.viewId + '?includeHistoricSprints=true&includeFutureSprints=true').replace('/rest/api/2', '/rest/greenhopper/latest'),
        method: 'GET',
        json: true,
        followAllRedirects: true,
      };

      jira.makeRequest(options, function(error, sprintquery) {
        if (error !== null) {
          slack.sendMsg(status.channel, 'Good morning!\n\nI encountered an error while trying to post the daily sprint status. Sorry about that!');
          return;
        }

        var activeSprint = null;

        sprintquery.sprints.forEach(function(sprint) {
          if (sprint.state === 'ACTIVE') {
            activeSprint = sprint.id;
          }
        });

        if (activeSprint === null) {
          slack.sendMsg(status.channel, 'Good morning!\n\nThere\'s currently no active sprint, so there\'s nothing for me to report today.');
        }

        var options = {
          uri: jira.buildURL('/rapid/charts/sprintreport?rapidViewId=' + status.viewId + '&sprintId=' + activeSprint).replace('/rest/api/2', '/rest/greenhopper/latest'),
          method: 'GET',
          json: true,
          followAllRedirects: true,
        };

        jira.makeRequest(options, function(error, sprint) {
          if (error !== null) {
            slack.sendMsg(status.channel, 'Good morning!\n\nI encountered an error while trying to post the daily sprint status. Sorry about that!');
            return;
          }

          slack.sendMsg(status.channel, 'Good morning!\n\nThe current sprint, ' + sprint.sprint.name + ', is due ' + sprint.sprint.endDate + '. There are currently ' + sprint.contents.incompletedIssues.length + ' incomplete issues estimated to take ' + Math.round(parseInt(sprint.contents.incompletedIssuesEstimateSum.value, 10) / 60 / 60, 2) + ' hours.\n\nI\'m here if you need me. Happy coding!');
        });
      });
    });
  });
}

function disableJiraStatus(pingu, data) {
  promise.ninvoke(redis, 'lrange', 'jirastatus', 0, -1).then(function(statuses) {
    if (statuses.length === 0) {
      slack.sendMsg(data.channel, '<@' + data.user + '>: The daily sprint status is not enabled.');
      return;
    }

    var found = false;
    statuses.forEach(function(status, index) {
      statusJson = JSON.parse(status);
      if (statusJson.channel === data.channel) {
        found = status;
      }
    });

    if (found === false) {
      slack.sendMsg(data.channel, '<@' + data.user + '>: The daily sprint status is not enabled.');
      return;
    }

    promise.ninvoke(redis, 'lrem', 'jirastatus', 0, found).then(function() {
      slack.sendMsg(data.channel, '<@' + data.user + '>: The daily sprint status is now *disabled*.');
    });
  });
}

function enableJiraStatus(pingu, data, viewId) {
  promise.ninvoke(redis, 'lrange', 'jirastatus', 0, -1).then(function(statuses) {
    if (statuses.length !== 0) {
      var found = false;
      statuses.forEach(function(status) {
        status = JSON.parse(status);

        if (status.channel === data.channel) {
          found = true;
        }
      });

      if (found === true) {
        slack.sendMsg(data.channel, '<@' + data.user + '>: The daily sprint status is already enabled.');
        return;
      }
    }

    var options = {
      uri: jira.buildURL('/rapidviews/list').replace('/rest/api/2', '/rest/greenhopper/latest'),
      method: 'GET',
      json: true,
      followAllRedirects: true,
    };

    viewId = parseInt(viewId[0], 10);

    jira.makeRequest(options, function(error, list) {
      if (error !== null) {
        slack.sendMsg(data.channel, '<@' + data.user + '>: I encountered an error while doing that.');
        return;
      }

      var found = false;
      list.views.forEach(function(view) {
        if (view.id === viewId) {
          found = view.name;
        }
      });

      if (found === false) {
        slack.sendMsg(data.channel, '<@' + data.user + '>: I couldn\'t find a board with ID #' + viewId + '.');
        return;
      }

      promise.ninvoke(redis, 'lpush', 'jirastatus', JSON.stringify({
        channel: data.channel,
        viewId: viewId,
      })).then(function(statuses) {
        slack.sendMsg(data.channel, '<@' + data.user + '>: The daily sprint status is now *enabled*. I will post about *' + found + '* every weekday at 8AM.');
      });
    });
  });
}

module.exports.getName = function() {
  return 'Jira';
};

module.exports.getSchedules = function() {
  return [
    {
      spec: '0 8 * * 1-5',
      command: postSprintStatus,
    },
  ];
};

module.exports.getTriggers = function(pinguId) {
  return [
    {
      regex: /(?:\s|^)!([A-Z]+-[0-9]+)/g,
      command: postJiraIssue,
      weight: 0,
    },
    {
      regex: new RegExp('^<@' + pinguId + '>(?::)? status off$', 'g'),
      command: disableJiraStatus,
      weight: 0,
    },
    {
      regex: new RegExp('^<@' + pinguId + '>(?::)? status on (\d+)$', 'g'),
      command: enableJiraStatus,
      weight: 0,
    },
  ];
};
