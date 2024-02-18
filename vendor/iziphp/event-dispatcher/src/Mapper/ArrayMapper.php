<?php

declare(strict_types=1);

namespace Easy\EventDispatcher\Mapper;

use Easy\EventDispatcher\EventMapperInterface;
use Easy\EventDispatcher\ListenerWrapper;
use Easy\EventDispatcher\Priority;
use Psr\Container\ContainerInterface;

/**
 * Maps events to listeners using an array.
 *
 * @package Easy\EventDispatcher\Mapper
 */
class ArrayMapper implements EventMapperInterface
{
    /**
     * An associative array that stores the wrapper classes associated with a
     * given event type.
     *
     * @var array<class-string,array<ListenerWrapper>>
     */
    private array $wrappers = [];

    /**
     * Constructs a new ArrayMapper instance.
     *
     * @param ContainerInterface $container
     * The container object used for resolving dependencies.
     */
    public function __construct(
        private ContainerInterface $container
    ) {
    }

    /**
     * Returns an iterable collection of ListenerWrappers for a given event
     * object.
     *
     * @inheritDoc
     */
    public function getListenersForEvent(object $event): iterable
    {
        foreach ($this->wrappers as $eventType => $wrappers) {
            if (!$event instanceof $eventType) {
                continue;
            }

            yield from $wrappers;
        }
    }

    /**
     * Adds a listener to the mapper.
     *
     * @param class-string $eventType
     * The name of the event class that the listener is subscribed to.
     * @param string|callable $listener
     * The name of the method or callback function that will be called when the
     * event is dispatched.
     * @param Priority $priority The priority level assigned to the listener.
     * @return ArrayMapper Returns this ArrayMapper instance.
     */
    public function addEventListener(
        string $eventType,
        string|callable $listener,
        Priority $priority = Priority::NORMAL
    ): self {
        if (!isset($this->wrappers[$eventType])) {
            $this->wrappers[$eventType] = [];
        }

        $this->wrappers[$eventType][] = new ListenerWrapper(
            $this->container,
            $listener,
            $priority
        );

        return $this;
    }
}
