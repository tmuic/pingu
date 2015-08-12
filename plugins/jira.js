var config  = require('config');
var jiraAPI = require('jira-connector');
var jira    = new jiraAPI( {
    host: config.get('jira.host'),
    basic_auth: {
        username: config.get('jira.username'),
        password: config.get('jira.password')
    }
});

function postJiraIssue(slack, data)
{
  var matches, issueRegex = /(?:\s|^)!([A-Z]+-[0-9]+)/g;

  while (matches = issueRegex.exec(data.text)) {
    jira.issue.getIssue({
        issueKey: matches[1]
    }, function(error, issue) {
        if (error === null) {
          var message  = '*'+issue.key+'*: '+issue.fields.summary+'\n';
              message += '>'+issue.fields.status.name+' '+issue.fields.issuetype.name;

          if (issue.fields.assignee !== null) {
            message += ' assigned to '+issue.fields.assignee.displayName;
          }

          if (issue.fields.components.length > 0) {
            message += ' affecting ';

            var components = [];
            for (var i = 0; i < issue.fields.components.length; i++) {
              components.push(issue.fields.components[i].name);
            }

            components = [components.slice(0, -1).join(', '), components.slice(-1)[0]].join(' and ');

            if (components.substr(0, 5) === ' and ') {
              components = components.substr(5);
            }

            message += components;
          }

          message += '\n>'+jira.host+'/browse/'+issue.key;

          slack.sendMsg(data.channel, message);
          return;
        }

        var errorMessage;

        switch (error.errorMessages[0]) {
          case 'Issue Does Not Exist':
            errorMessage = 'I couldn\'t find the issue you\'re looking for.';
            break;
          case 'You do not have the permission to see the specified issue.':
            errorMessage = 'I lack the permission to retrieve that issue for you.';
            break;
          default:
            console.log(error.errorMessages[0]);
            errorMessage = 'JIRA gave me an unknown error message. Check my logs for more information.';
            break;
        }

        // error.errorMessages[0]
        slack.sendMsg(data.channel, '<@'+data.user+'>: Sorry, hun! '+errorMessage);
    });
    return true;
  }

  return false;
}

module.exports = {
  exec: function (slack, data) {
    postJiraIssue(slack, data);
  }
};
