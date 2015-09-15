<?php
namespace Pingu\Interfaces;

interface HandlerInterface
{
    public function getEventType();
    public function handle(\StdClass $payload);
}
