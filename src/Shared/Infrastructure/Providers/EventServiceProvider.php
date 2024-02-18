<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Providers;

use Application;
use Easy\Container\Attributes\Inject;
use Easy\EventDispatcher\EventDispatcher;
use Easy\EventDispatcher\ListenerProvider;
use Easy\EventDispatcher\Mapper\ArrayMapper;
use Easy\EventDispatcher\Mapper\EventAttributeMapper;
use Easy\EventDispatcher\Mapper\ListenerAttributeMapper;
use Psr\Container\ContainerInterface;
use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\EventDispatcher\ListenerProviderInterface;
use Shared\Infrastructure\ServiceProviderInterface;

/** @package Shared\Infrastructure\Providers */
class EventServiceProvider implements ServiceProviderInterface
{
    /**
     * @param ContainerInterface $container
     * @return void
     */
    public function __construct(
        private ContainerInterface $container,

        #[Inject('config.enable_debugging')]
        private bool $enableDebugging = false,

        #[Inject('config.enable_caching')]
        private bool $enableCaching = false,
    ) {
    }

    /** @inheritDoc */
    public function register(Application $app): void
    {
        // Create provider instance
        $provider = new ListenerProvider();

        // Add event mappers here. Multiple event mappers can be added.
        $provider
            ->addMapper($this->container->get(ArrayMapper::class))
            ->addMapper($this->container->get(EventAttributeMapper::class))
            ->addMapper($this->getListenerAttributeMapper());

        // Create dispatcher instance
        $dispatcher = new EventDispatcher($provider);

        // Set the dispatcher and provider instances to the container
        $app
            ->set(ListenerProviderInterface::class, $provider)
            ->set(EventDispatcherInterface::class, $dispatcher);
    }

    private function getListenerAttributeMapper(): ListenerAttributeMapper
    {
        /** @var ListenerAttributeMapper */
        $mapper = $this->container->get(ListenerAttributeMapper::class);

        $this->enableCaching && !$this->enableDebugging
            ? $mapper->enableCaching()
            : $mapper->disableCaching();

        return $mapper;
    }
}
