<?php
namespace Pingu;

use Monolog\Handler\SlackHandler as MonologHandler;

final class SlackHandler extends MonologHandler
{
    protected function prepareContentData($record)
    {
        $record            = parent::prepareContentData($record);
        $record['as_user'] = true;
        $record['text']    = 'Noot Noot! I encountered an error!';
        $record['text']   .= ' I\'ve included the details below, hopefully it\'s nothing too serious.';

        unset($record['username']);

        return $record;
    }
}
