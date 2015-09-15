<?php
function shortest_path($path) {
    $currentDir = str_replace('\\', '/', getcwd());
    $path       = str_replace('\\', '/', $path);
    $parts      = explode('/', $path);
    $oldKey     = null;

    foreach ($parts as $key => $part) {
        switch ($part) {
            case '.':
                unset($parts[$key]);
                break;
            case '..':
                unset($parts[$key]);
                unset($parts[$oldKey]);
                $oldKey--;
                break;
            default:
                $oldKey = $key;
                break;
        }
    }

    return str_replace($currentDir, '.', implode('/', $parts));
}
