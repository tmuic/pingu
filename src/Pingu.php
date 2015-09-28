<?php
namespace Pingu;

use Cilex\Application;
use Frlnc\Slack\Http\SlackResponseFactory;
use Frlnc\Slack\Http\CurlInteractor;
use Frlnc\Slack\Core\Commander;
use Monolog\Logger;
use Pheanstalk\Pheanstalk;
use Pingu\Services\Jira;
use Pingu\Services\Slack;
use React\EventLoop\Factory as EventLoopFactory;
use SebastianBergmann\Version;
use Stash\Driver\Redis;
use Stash\Pool;
use Yosymfony\Toml\Toml;

final class Pingu extends Application
{
    const VERSION = '2.0';

    static private $commands = [
        '\\Pingu\\Commands\\DaemonCommand',
        '\\Pingu\\Commands\\ListenCommand',
        '\\Pingu\\Commands\\WorkCommand',
    ];

    static private $plugins = [
        '\\Pingu\\Plugins\\InteractionPlugin',
        '\\Pingu\\Plugins\\JiraPlugin',
    ];

    static private $types = [
        '\\Pingu\\Types\\LatencyType',
        '\\Pingu\\Types\\MessageType',
    ];

    private $me;

    public static function bootstrap($configPath)
    {
        $pingu = new self($configPath);

        foreach (self::$commands as $command) {
            $pingu->command(new $command($pingu));
        }

        $pingu->run();
    }

    public function __construct($configPath)
    {
        $version = new Version(self::VERSION, __DIR__.'/../');
        parent::__construct('Pingu', $version->getVersion());

        if (file_exists($configPath) === false) {
            throw new \RuntimeException('Unable to read configuration from '.$configPath);
        }

        $this['config'] = $this->share(function () use ($configPath) {
            return Toml::parse(file_get_contents($configPath));
        });

        $this->registerServices();
    }

    public function getId()
    {
        if ($this->me === null) {
            $this->me = $this['slack']->getMe();
        }

        return $this->me['id'];
    }

    private function registerServices()
    {
        $this['cache'] = $this->share(function ($pingu) {
            return new Pool(new Redis([
                'servers' => [[$pingu['config']['redis']['host'], $pingu['config']['redis']['port']]],
            ]));
        });

        $this['types'] = $this->share(function ($pingu) {
            $types = [];

            foreach (self::$types as $type) {
                $types[] = new $type($pingu);
            }

            return $types;
        });

        $this['jira'] = $this->share(function ($pingu) {
            return new Jira(
                $pingu['config']['jira']['host'],
                $pingu['config']['jira']['username'],
                $pingu['config']['jira']['password'],
                $pingu['cache']
            );
        });

        $this['loop'] = $this->share(function ($pingu) {
            return EventLoopFactory::create();
        });

        $this['logger'] = $this->share(function ($pingu) {
            $log = new Logger('Pingu');

            $log->pushHandler(new SlackHandler(
                $pingu['config']['slack']['token'],
                $pingu['config']['slack']['channel'],
                $pingu['config']['slack']['name'],
                true,
                null,
                Logger::WARNING
            ));

            return $log;
        });

        $this['plugins'] = $this->share(function ($pingu) {
            $plugins = [];

            foreach (self::$plugins as $plugin) {
                $plugins[] = new $plugin($pingu);
            }

            return $plugins;
        });

        $this['queue'] = $this->share(function ($pingu) {
            $queue = new Pheanstalk($pingu['config']['beanstalkd']['host'], $pingu['config']['beanstalkd']['port']);

            if ($queue->getConnection()->isServiceListening() === false) {
                throw new \RuntimeException('Beanstalkd server is not listening');
            }

            $queue->useTube($pingu['config']['beanstalkd']['tube']);
            $queue->watchOnly($pingu['config']['beanstalkd']['tube']);

            return $queue;
        });

        $this['slack'] = $this->share(function ($pingu) {
            return new Slack($pingu['config']['slack']['token'], $pingu['cache']);
        });
    }
}
