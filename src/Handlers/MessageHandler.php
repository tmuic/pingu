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

<<<<<<< 04c925962472ec337e74183da16ea2aade0a3130
        if (isset($payload->subtype) === true) {
            if (isset($this->types[$payload->subtype]) === true) {
                foreach ($this->types[$payload->subtype] as $handler) {
                    call_user_func($handler, $payload);
                }
            }
        }

        if (isset($payload->text) === true) {
            foreach ($this->triggers as $trigger => $handlers) {
                if (preg_match_all($trigger, $payload->text, $matches) > 0) {
                    foreach ($handlers as $handler) {
                        try {
                            call_user_func($handler, $payload, $matches);
                        } catch (\Exception $e) {
                            $this->pingu['logger']->addError($e);
                            if (isset($payload->channel) and isset($payload->user) and $payload->channel !== $this->pingu['config']['slack']['channel']) {
                                $user         = $this->pingu['slack']->getUser($payload->user);
                                $errorMessage = '@'.$user['name'].': Your message made me crash unexpectedly. Thanks for that!';
   
                                $this->pingu['slack']->sendMessage($payload->channel, $errorMessage);
                            }
                        }
                    }
                }
=======
        foreach ($this->pingu['types'] as $potentialHandler) {
            if ($potentialHandler->getEvent() === $payload->type) {
                $handler = $potentialHandler;
                continue;
>>>>>>> Use WebSockets through PHP to improve latency
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
