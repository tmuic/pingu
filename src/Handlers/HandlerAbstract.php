<?php
namespace Pingu\Handlers;

use Pingu\Pingu;

abstract class HandlerAbstract
{
    protected $pingu;

    public function __construct(Pingu $pingu)
    {
        $this->pingu = $pingu;
    }
}
