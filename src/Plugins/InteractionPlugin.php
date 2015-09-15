<?php
namespace Pingu\Plugins;

final class InteractionPlugin extends PluginAbstract
{
    const NAME = 'Interaction';

    protected $triggers = [
        '/^<@{:pingu:}>/' => 'handleMentionMessage',
    ];

    protected $types = [
        'channel_join' => 'handleJoinType',
    ];

    public function getName()
    {
        return self::NAME;
    }

    public function handleJoinType(\StdClass $payload)
    {
        $user    = $this->pingu['slack']->getUser($payload->user);
        $message = 'Welcome @'.$user['name'].'!';

        $this->pingu['slack']->sendMessage($payload->channel, $message);
    }

    public function handleMentionMessage(\StdClass $payload)
    {
        $user    = $this->pingu['slack']->getUser($payload->user);
        $message = '@'.$user['name'].': Noot Noot!';

        $this->pingu['slack']->sendMessage($payload->channel, $message);
    }
}
