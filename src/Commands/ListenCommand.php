<?php
namespace Pingu\Commands;

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
        $listenerPath = __DIR__.'/../../listener.js';

        if (file_exists($listenerPath) === false) {
            throw new \RuntimeException('Unable to find listener at '.$listenerPath);
        }

        $listenerPath = ProcessUtils::escapeArgument($listenerPath);
        $slackToken   = ProcessUtils::escapeArgument($this->pingu['config']['slack']['token']);
        $process      = new Process(sprintf('node %s %s', $listenerPath, $slackToken));

        $process->setTimeout(0);
        $process->start();

        //$pid = $process->getPid(); // @todo: Store the pid somewhere so we can check it in a future web interface.

        $process->wait(function ($type, $buffer) {
            if (Process::ERR === $type) {
                // @todo: Log errors.
                return;
            }

            $payload = json_decode($buffer);

            if (json_last_error() !== JSON_ERROR_NONE) {
                // @todo: Handle invalid JSON.
                return;
            }

            $this->pingu['queue']->put(json_encode($payload));
        });
    }
}
