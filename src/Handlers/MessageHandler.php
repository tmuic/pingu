<?php
namespace Pingu\Handlers;

use Ratchet\Client\WebSocket;

class MessageHandler extends HandlerAbstract
{
    public function __invoke($msg) {
        $payload = json_decode($msg);
        $handler = null;

        if (isset($payload->type) === false) {
            print 'unknown payload'.PHP_EOL;
            return;
        }

        foreach ($this->pingu['types'] as $potentialHandler) {
            if ($potentialHandler->getEvent() === $payload->type) {
                $handler = $potentialHandler;
                continue;
            }
        }

        if ($handler === null) {
            print 'no handler found for '.$payload->type.PHP_EOL;
            return;
        }

        try {
            print 'handle '.$payload->type.' here'.PHP_EOL;
            $handler->handle($payload);
        } catch (\Exception $e) {
            // @todo: do something with errors.
        }
    }
}
