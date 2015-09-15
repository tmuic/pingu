<?php
namespace Pingu\Services;

use chobie\Jira\Api;
use chobie\Jira\Api\Authentication\Basic;
use chobie\Jira\Api\Exception;
use Stash\Interfaces\PoolInterface;
use Stash\Pool;

final class Jira
{
    private $cache;
    private $client;
    private $host;

    public function __construct($host, $username, $password, PoolInterface $cache = null)
    {
        $this->host   = rtrim($host, '/');
        $this->cache  = ($cache === null) ? new Pool : $cache;
        $this->client = new Api($this->host, new Basic($username, $password));
    }

    public function getIssue($issueKey)
    {
        $item  = $this->cache->getItem('/Jira/Issues/'.$issueKey);
        $issue = $item->get();

        if ($item->isMiss()) {
            $item->lock();

            $issue = $this->client->getIssue($issueKey)->getResult();

            if (isset($issue['errorMessages']) === true and count($issue['errorMessages']) > 0) {
                $issue = null;
            }

            if (isset($issue['errors']) === true and count($issue['errors']) > 0) {
                $issue = null;
            }

            $item->set($issue, 600);
        }

        return $issue;
    }

    public function getIssueLink($issueKey)
    {
        return '<'.$this->getHost().'/browse/'.$issueKey.'|'.$issueKey.'>';
    }

    public function getIssueStatusColor($color)
    {
        switch ($color) {
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

    public function getHost()
    {
        return $this->host;
    }
}
