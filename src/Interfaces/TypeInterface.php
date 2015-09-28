<?php
namespace Pingu\Interfaces;

interface TypeInterface
{
    public function getEvent();
    public function handle(\StdClass $payload);
}
