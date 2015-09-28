<?php
namespace Pingu\Handlers;

use Ratchet\Client\WebSocket;

class SocketHandler extends HandlerAbstract
{
    public function __invoke(WebSocket $connection)
    {
        $this->pingu['slack']->setConnection($connection);
        $connection->on('message', new MessageHandler($this->pingu));

        $this->pingu['loop']->addPeriodicTimer(60, function () {
            $this->pingu['slack']->ping();
        });
    }
}
