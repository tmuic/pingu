<?php
namespace Pingu\Services;

use Frlnc\Slack\Http\SlackResponseFactory;
use Frlnc\Slack\Http\CurlInteractor;
use Frlnc\Slack\Core\Commander;
use Pingu\Exceptions\SlackException;
use Stash\Interfaces\PoolInterface;
use Stash\Pool;

final class Slack
{
    private $cache;
    private $client;
    private $errors = [
        'account_inactive'  => 'Authentication token is for a deleted user or team.',
        'channel_not_found' => 'Value passed for channel was invalid.',
        'invalid_auth'      => 'Invalid authentication token.',
        'is_archived'       => 'Channel has been archived.',
        'msg_too_long'      => 'Message text is too long.',
        'no_text'           => 'No message text provided.',
        'not_authed'        => 'No authentication token provided.',
        'not_in_channel'    => 'Cannot post user messages to a channel they are not in.',
        'rate_limited'      => 'Application has posted too many messages.',
        'user_not_found'    => 'Value passed for user was invalid.',
        'user_not_visible'  => 'The requested user is not visible to the calling user.',
    ];
    private $token;

    public function __construct($token, PoolInterface $cache = null)
    {
        $this->token  = $token;
        $this->cache  = ($cache === null) ? new Pool : $cache;
        $interactor   = new CurlInteractor;
        $this->client = new Commander($token, $interactor);

        $this->cache->setNamespace('pingu');
        $interactor->setResponseFactory(new SlackResponseFactory);
    }

    public function getMe()
    {
        $item = $this->cache->getItem('/Slack/Users/'.$this->token);
        $user = $item->get();

        if ($item->isMiss()) {
            $item->lock();

            $response = $this->makeRequest('auth.test');
            $user     = $this->getUser($response['user_id']);

            $item->set($user, 3600);
        }

        return $user;
    }

    public function getUser($userId)
    {
        $item = $this->cache->getItem('/Slack/Users/' . $userId);
        $user = $item->get();

        if ($item->isMiss()) {
            $item->lock();

            $response = $this->makeRequest('users.info', [
                'user' => $userId,
            ]);

            $user = $response['user'];
            $item->set($user, 3600);
        }

        return $user;
    }

    public function sendMessage($channel, $message, $attachments = [])
    {
        $this->makeRequest('chat.postMessage', [
            'channel'      => $channel,
            'text'         => $message,
            'as_user'      => true,
            'link_names'   => 1,
            'unfurl_links' => false,
            'unfurl_media' => true,
            'attachments'  => json_encode($attachments),
        ]);
    }

    private function makeRequest($method, $data = [])
    {
        $response = $this->client->execute($method, $data);
        $body     = $response->getBody();

        if ($body['ok'] === false) {
            if (array_key_exists($body['error'], $this->errors) === true) {
                $body['error'] = $this->errors[$body['error']];
            }

            throw new SlackException($body['error']);
        }

        return $body;
    }
}
