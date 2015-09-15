<?php
namespace Pingu\Handlers;

final class LatencyHandler extends HandlerAbstract
{
    const EVENT_TYPE = 'latency';

    public function getEventType()
    {
        return self::EVENT_TYPE;
    }

    public function handle(\StdClass $payload)
    {
        // @todo: Do something with the latency report.
    }
}
