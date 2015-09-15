<?php
namespace Pingu\Handlers;

use Pingu\Interfaces\HandlerInterface;
use Pingu\Pingu;

abstract class HandlerAbstract implements HandlerInterface
{
    protected $pingu;

    public function __construct(Pingu $pingu)
    {
        $this->pingu = $pingu;
    }
}
