<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Providers;

use Application;
use Easy\Emitter\SapiEmitter;
use Easy\Http\ResponseEmitter\EmitterInterface;
use Easy\Http\Server\DispatcherInterface;
use Easy\Router\Dispatcher;
use Shared\Infrastructure\ServiceProviderInterface;

/** @package Shared\Infrastructure\Providers */
class HttpServiceProvider implements ServiceProviderInterface
{
    /** @inheritDoc */
    public function register(Application $app): void
    {
        $app
            ->set(EmitterInterface::class, SapiEmitter::class)
            ->set(DispatcherInterface::class, Dispatcher::class);
    }
}
