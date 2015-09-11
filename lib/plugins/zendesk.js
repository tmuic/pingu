var config  = require('config');
var promise = require('q');
var Zendesk = require('node-zendesk');
var logger  = require('jethro');
var zendesk = Zendesk.createClient({
  username:  config.get('zendesk.username'),
  token:     config.get('zendesk.token'),
  remoteUri: config.get('zendesk.url') + '/api/v2',
});

function log(severity, message) {
  if (severity !== 'debug' || config.get('debug') === true) {
    logger(severity, 'Zendesk', message);
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getFromCacheOrMakeRequest(id, endpoint, pingu) {
  var deferred = promise.defer();

  if (id === null) {
    return null;
  }

  pingu.getStore().getFromHash(endpoint, id).then(function(zObject) {
    if (zObject !== null) {
      log('debug', 'Fetched #' + id + ' from ' + endpoint + ' cache.');
      deferred.resolve(zObject);
      return;
    }

    zendesk[endpoint].show(id, function(err, req, zObject) {
      log('debug', 'Fetched #' + id + ' from Zendesk\'s ' + endpoint + ' API.');
      if (err !== null) {
        deferred.resolve(null);
        return;
      }

      pingu.getStore().addToHash(endpoint, id, zObject).then(function() {
        deferred.resolve(zObject);
      }, function() {

        deferred.reject();
      });
    });
  }, function() {

    deferred.reject();
  });

  return deferred.promise;
}

function getGroup(groupId, pingu) {
  return getFromCacheOrMakeRequest(groupId, 'groups', pingu);
}

function getOrganization(organizationId, pingu) {
  return getFromCacheOrMakeRequest(organizationId, 'organizations', pingu);
}

function getUser(userId, pingu) {
  return getFromCacheOrMakeRequest(userId, 'users', pingu);
}

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

function makeIssueAttachment(issueKey, pingu) {
  var deferred = promise.defer();

  zendesk.tickets.show(issueKey, function(err, req, issue) {
    if (err !== null) {
      deferred.reject(['#' + issueKey, err.toString() + '.']);
      return;
    }

    var message = '';

    promise.when(getOrganization(issue.organization_id, pingu), function (organization) {
      promise.when(getGroup(issue.group_id, pingu), function (group) {
        promise.when(getUser(issue.assignee_id, pingu), function (assignee) {
          if (assignee !== null) {
            message += '_Assigned to_ *' + assignee.name + '*';
          }

          if (organization !== null) {
            message += ' _affecting_ *' + organization.name + '*';
          } else if (group !== null) {
            message += ' _affecting_ *' + group.name + '*';
          }

          if (message.substr(0, 3) === ' _a') {
            message = '_A' + message.substr(3);
          }

          if (message !== '') {
            message += '.\n';
          }

          if (issue.tags.length > 0) {
            message += '_Tagged as_ ';

            var tags = [];
            for (var i = 0; i < issue.tags.length; i++) {
              tags.push('*' + issue.tags[i] + '*');
            }

            tags = [tags.slice(0, -1).join(', '), tags.slice(-1)[0]].join(' _and_ ');

            if (tags.substr(0, 7) === ' _and_ ') {
              tags = tags.substr(7);
            }

            message += tags + '.';
          }

          attachmentTitle  = capitalizeFirstLetter(issue.status) + ' ';
          attachmentTitle += (issue.type !== null) ? capitalizeFirstLetter(issue.type) : ' Ticket';

          deferred.resolve({
            author_name: attachmentTitle,
            fallback: '#' + issue.id + ': ' + issue.subject,
            pretext: '*<' + config.get('zendesk.url') + '/agent/tickets/' + issue.id + '|#' + issue.id + '>*: ' + issue.subject,
            mrkdwn_in: ['pretext', 'text'],
            text: message,
          });
        }, function() {

          deferred.reject(['#' + issueKey, 'User request failed for #' + issueKey + '.']);
          return;
        });
      }, function() {

        deferred.reject(['#' + issueKey, 'Group request failed for #' + issueKey + '.']);
        return;
      });
    }, function() {

      deferred.reject(['#' + issueKey, 'Organization request failed for #' + issueKey + '.']);
      return;
    });
  });

  return deferred.promise;
}

function postZendeskIssue(pingu, data, issues) {
  issues.forEach(function(issue, index) {
    issues[index] = makeIssueAttachment(issue, pingu);
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
      var errorIds = [];
      for (var i = 0; i < errors.length; i++) {
        errorIds.push(errors[i][0]);
        log('error', errors[i][1]);
      }

      var errorMessage = [errorIds.slice(0, -1).join(', '), errorIds.slice(-1)[0]].join(' and ');

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
    },
  ];
};
