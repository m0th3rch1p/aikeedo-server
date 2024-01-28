<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Providers;

use Application;
use Easy\Container\Attributes\Inject;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Monolog\Processor\PsrLogMessageProcessor;
use Psr\Log\LoggerInterface;
use Shared\Infrastructure\ServiceProviderInterface;

/** @package Shared\Infrastructure\Providers */
class LoggerServiceProvider implements ServiceProviderInterface
{
    /**
     * @param string $logDir
     * @return void
     */
    public function __construct(
        #[Inject('config.dirs.log')]
        private string $logDir,
    ) {
    }

    /** @inheritDoc */
    public function register(Application $app): void
    {
        $logger = new Logger('app');

        $logger->pushHandler(new StreamHandler($this->logDir . '/app.log'));
        $logger->pushProcessor(new PsrLogMessageProcessor());

        $app->set(LoggerInterface::class, $logger);
    }
}
