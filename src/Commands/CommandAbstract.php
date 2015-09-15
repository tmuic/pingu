<?php
namespace Pingu\Commands;

use Cilex\Command\Command;
use Pingu\Pingu;

abstract class CommandAbstract extends Command
{
    protected $pingu;

    public function __construct(Pingu $pingu)
    {
        $this->pingu = $pingu;
        parent::__construct();
    }
}
