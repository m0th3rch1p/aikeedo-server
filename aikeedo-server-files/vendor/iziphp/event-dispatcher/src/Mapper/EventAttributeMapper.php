<?php

declare(strict_types=1);

namespace Easy\EventDispatcher\Mapper;

use Easy\EventDispatcher\Attributes\Listener;
use Easy\EventDispatcher\EventMapperInterface;
use Easy\EventDispatcher\ListenerWrapper;
use Psr\Container\ContainerInterface;
use ReflectionObject;

/**
 * Maps events to listeners based on attributes defined on the event object.
 *
 * @package Easy\EventDispatcher\Mapper
 */
class EventAttributeMapper implements EventMapperInterface
{
    /**
     * Constructs a new EventAttributeMapper instance.
     *
     * @param ContainerInterface $container
     * The container object used for resolving dependencies.
     */
    public function __construct(
        private ContainerInterface $container
    ) {
    }

    /**
     * @inheritDoc
     */
    public function getListenersForEvent(object $event): iterable
    {
        $reflection = new ReflectionObject($event);

        while ($reflection) {
            $attributes = $reflection->getAttributes(Listener::class);

            foreach ($attributes as $attribute) {
                $listener = $attribute->newInstance();

                yield new ListenerWrapper(
                    $this->container,
                    $listener->className,
                    $listener->priority
                );
            }

            $reflection = $reflection->getParentClass();
        }
    }
}
