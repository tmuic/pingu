<?php
namespace Pingu\Interfaces;

interface PluginInterface
{
    public function getName();
    public function getTriggers();
    public function getTypes();
}
