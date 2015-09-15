<?php
namespace Pingu\Commands;

use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

final class WorkCommand extends CommandAbstract
{
    /**
     * {@inheritDoc}
     */
    protected function configure()
    {
        $this->setName('work')->setDescription('Process the next job in the beanstalkd queue');
    }

    /**
     * {@inheritDoc}
     */
    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $job     = $this->pingu['queue']->reserve();
        $payload = json_decode($job->getData());
        $handler = null;

        foreach ($this->pingu['handlers'] as $potentialHandler) {
            if ($potentialHandler->getEventType() === $payload->type) {
                $handler = $potentialHandler;
                continue;
            }
        }

        if ($handler === null) {
            // @todo: handle unknown events.
            $this->pingu['queue']->delete($job);
            return;
        }

        try {
            $handler->handle($payload->payload);
            $this->pingu['queue']->delete($job);
        } catch (\Exception $e) {
            // @todo: do something with errors.
            $this->pingu['queue']->delete($job);
        }
    }
}
