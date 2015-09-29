<?php
namespace Pingu\Handlers;

use Ratchet\Client\WebSocket;

class MessageHandler extends HandlerAbstract
{
    public function __invoke($msg) {
        $payload = json_decode($msg);
        $handler = null;

        if (isset($payload->type) === false) {
            return;
        }

        foreach ($this->pingu['types'] as $potentialHandler) {
            if ($potentialHandler->getEvent() === $payload->type) {
                $handler = $potentialHandler;
                continue;
            }
        }

        if ($handler === null) {
            return;
        }

        try {
            $handler->handle($payload);
        } catch (\Exception $e) {
            // @todo: do something with errors.
        }
    }
}
