<?php
namespace Pingu\Types;

use Pingu\Pingu;

final class MessageType extends TypeAbstract
{
    const EVENT = 'message';

    private $triggers = [];
    private $types    = [];

    public function __construct(Pingu $pingu)
    {
        parent::__construct($pingu);

        $pinguId = $this->pingu->getId();
        foreach ($this->pingu['plugins'] as $plugin) {
            foreach ($plugin->getTriggers() as $trigger => $handler) {
                $trigger = str_replace('{:pingu:}', $pinguId, $trigger);
                $this->triggers[$trigger][] = [$plugin, $handler];
            }

            foreach ($plugin->getTypes() as $type => $handler) {
                $this->types[$type][] = [$plugin, $handler];
            }
        }
    }

    public function getEvent()
    {
        return self::EVENT;
    }

    public function handle(\StdClass $payload)
    {
        if ($this->shouldHandleMessage($payload) === false) {
            return;
        }

        if (isset($payload->subtype) === true) {
            if (isset($this->types[$payload->subtype]) === true) {
                foreach ($this->types[$payload->subtype] as $handler) {
                    call_user_func($handler, $payload);
                }
            }
        }

        if (isset($payload->text) === true) {
            foreach ($this->triggers as $trigger => $handlers) {
                if (preg_match_all($trigger, $payload->text, $matches) > 0) {
                    foreach ($handlers as $handler) {
                        try {
                            $this->pingu['slack']->type($payload->channel);
                            call_user_func($handler, $payload, $matches);
                        } catch (\Exception $e) {
                            $this->pingu['logger']->addError($e);
                            if (isset($payload->channel) and isset($payload->user) and $payload->channel !== $this->pingu['config']['slack']['channel']) {
                                $user         = $this->pingu['slack']->getUser($payload->user);
                                $errorMessage = '@'.$user['name'].': Your message made me crash unexpectedly. Thanks for that!';

                                $this->pingu['slack']->sendMessage($payload->channel, $errorMessage);
                            }
                        }
                    }
                }
            }
        }
    }

    private function shouldHandleMessage(\StdClass $payload)
    {
        if (isset($payload->reply_to) === true) {
            return false;
        }

        if (isset($payload->user) === true and $payload->user === $this->pingu->getId()) {
            return false;
        }

        return true;
    }
}
