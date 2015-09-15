<?php
namespace Pingu\Plugins;

use chobie\Jira\Api\Result;

final class JiraPlugin extends PluginAbstract
{
    const NAME = 'Jira';

    protected $triggers = [
        '/(?:\s|^)!([A-Z]+-[0-9]+)/' => 'handleJiraIssueLookup',
    ];

    public function getName()
    {
        return self::NAME;
    }

    public function handleJiraIssueLookup(\StdClass $payload, array $matches)
    {
        $attachments = [];
        $issues      = [];
        $invalid     = [];

        foreach ($matches[1] as $issueKey) {
            $issue = $this->pingu['jira']->getIssue($issueKey);

            if ($issue === null) {
                $invalid[] = $issueKey;
                continue;
            }

            $issues[] = $issue;
        }

        foreach ($issues as $issue) {
            $attachments[] = $this->createIssueAttachment($issue);
        }

        $errorMessage = '';

        if (count($invalid) > 0) {
            $invalid = implode(' and ', [
                implode(', ', array_slice($invalid, 0, -1)),
                array_slice($invalid, -1)[0],
            ]);

            if (substr($invalid, 0, 5) === ' and ') {
                $invalid = substr($invalid, 5);
            }

            $user         = $this->pingu['slack']->getUser($payload->user);
            $errorMessage = '@'.$user['name'].': I was unable to retrieve '.$invalid.'.';
        }

        $this->pingu['slack']->sendMessage($payload->channel, '', $attachments);
        $this->pingu['slack']->sendMessage($payload->channel, $errorMessage);
    }

    private function createIssueAttachment(array $issue)
    {
        $body = '';

        if (isset($issue['fields']['assignee']) === true) {
            $body .= '_Assigned to_ *'.$issue['fields']['assignee']['displayName'].'*';
        }

        if (count($issue['fields']['components']) > 0) {
            $body      .= ($body === '') ? '_Affecting_ ' : ' _affecting_ ';
            $components = [];

            foreach ($issue['fields']['components'] as $component) {
                $components[] = '*'.$component['name'].'*';
            }

            $components = implode(' _and_ ', [
                implode(', ', array_slice($components, 0, -1)),
                array_slice($components, -1)[0],
            ]);

            if (substr($components, 0, 7) === ' _and_ ') {
                $components = substr($components, 7);
            }

            $body .= $components;
        }

        if ($body !== '') {
            $body .= '.';
        }

        if (isset($issue['fields']['parent']) === true) {
            $parent = $issue['fields']['parent'];

            if ($body !== '') {
                $body .= PHP_EOL;
            }

            $type  = mb_strtolower($parent['fields']['issuetype']['name'], 'utf-8');
            $link  = $this->pingu['jira']->getIssueLink($parent['key']);
            $body .= '_Belongs to the '.$type.' *'.$link.'*: '.$parent['fields']['summary'].'_.';
        }

        $link  = $this->pingu['jira']->getIssueLink($issue['key']);
        $color = $this->pingu['jira']->getIssueStatusColor($issue['fields']['status']['statusCategory']['colorName']);

        return [
          'author_icon' => $issue['fields']['status']['iconUrl'],
          'author_name' => $issue['fields']['status']['name'].' '.$issue['fields']['issuetype']['name'],
          'color'       => $color,
          'fallback'    => $issue['key'].': '.$issue['fields']['summary'],
          'pretext'     =>  '*'.$link.'*: '.$issue['fields']['summary'],
          'mrkdwn_in'   => ['pretext', 'text'],
          'text'        => $body,
        ];
    }
}
