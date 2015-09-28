<?php
namespace Pingu\Types;

final class LatencyType extends TypeAbstract
{
    const EVENT = 'latency';

    public function getEvent()
    {
        return self::EVENT;
    }

    public function handle(\StdClass $payload)
    {
        // @todo: Do something with the latency report.
    }
}
