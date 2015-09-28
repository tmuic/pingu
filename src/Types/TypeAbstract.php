<?php
namespace Pingu\Types;

use Pingu\Interfaces\TypeInterface;
use Pingu\Pingu;

abstract class TypeAbstract implements TypeInterface
{
    protected $pingu;

    public function __construct(Pingu $pingu)
    {
        $this->pingu = $pingu;
    }
}
