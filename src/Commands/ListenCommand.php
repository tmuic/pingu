<?php
namespace Pingu\Commands;

use Pingu\Handlers\SocketHandler;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\ProcessUtils;

final class ListenCommand extends CommandAbstract
{
    /**
     * {@inheritDoc}
     */
    protected function configure()
    {
        $this->setName('listen')->setDescription('Listen for new events using Slack\'s RTM API');
    }

    /**
     * {@inheritDoc}
     */
    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $pingu = $this->pingu;
        $loop  = $pingu['loop'];


        $pingu['slack']->getRTM($loop)->then(new SocketHandler($pingu), function ($e) use ($loop, $output) {
            $output->writeln($e->getMessage());
            $loop->stop();
        });

        $loop->run();
    }
}
