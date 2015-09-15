<?php
namespace Pingu\Plugins;

use Pingu\Interfaces\PluginInterface;
use Pingu\Pingu;

abstract class PluginAbstract implements PluginInterface
{
    protected $pingu;

    protected $triggers = [
    ];

    protected $types = [
    ];

    public function __construct(Pingu $pingu)
    {
        $this->pingu = $pingu;
    }

    public function getTriggers()
    {
        return $this->triggers;
    }

    public function getTypes()
    {
        return $this->types;
    }
}
