<?php
namespace Pingu\Commands;

use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Process\Process;

final class DaemonCommand extends CommandAbstract
{
    /**
     * {@inheritDoc}
     */
    protected function configure()
    {
        $this->setName('daemon')->setDescription('Listen for jobs in the beanstalkd queue and process them');
    }

    /**
     * {@inheritDoc}
     */
    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $command = PHP_BINARY.' ./bin/pingu work';
        $process = new Process($command, shortest_path(__DIR__.'/../../'), null, null, 60);

        while (true) {
            $process->run();

            if ((memory_get_usage() / 1024 / 1024) >= 128) {
                die;
            }
        }
    }
}
