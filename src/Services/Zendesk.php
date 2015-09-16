<?php
namespace Pingu\Services;

use Stash\Interfaces\PoolInterface;
use Stash\Pool;
use Zendesk\API\HttpClient as ZendeskAPI;

final class Zendesk
{
    private $cache;
    private $client;
    private $host;

    public function __construct($subdomain, $username, $token, PoolInterface $cache = null)
    {
        $this->cache  = ($cache === null) ? new Pool : $cache;
        $this->client = new ZendeskAPI($subdomain, $username);

        $this->setAuth('basic', [
            'username' => $username,
            'token'    => $token,
        ]);
    }

    public function getTicket($ticketId)
    {
        $item   = $this->cache->getItem('/Zendesk/Tickets/'.$ticketId);
        $ticket = $item->get();

        if ($item->isMiss()) {
            $item->lock();

            $ticket = $this->client->issues()-get($ticketId);

            $item->set($ticket, 600);
        }

        return $ticket;
    }
}
