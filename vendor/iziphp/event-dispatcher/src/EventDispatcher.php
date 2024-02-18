<?php

declare(strict_types=1);

namespace Easy\EventDispatcher;

use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\EventDispatcher\ListenerProviderInterface;
use Psr\EventDispatcher\StoppableEventInterface;

/**
 * EventDispatcher class is used to dispatch events.
 * @package Easy\EventDispatcher
 */
class EventDispatcher implements EventDispatcherInterface
{
    /**
     * Constructor for the EventDispatcher class.
     *
     * @param ListenerProviderInterface $listenerProvider
     * @return void
     */
    public function __construct(
        private ListenerProviderInterface $listenerProvider
    ) {
    }

    /**
     * Dispatches an event to all registered listeners.
     *
     * @inheritDoc
     */
    public function dispatch(object $event)
    {
        // Check if the event is stoppable
        $isStoppable = $event instanceof StoppableEventInterface;

        // If the event is stoppable and propagation is stopped, return the event
        if ($isStoppable && $event->isPropagationStopped()) {
            return $event;
        }

        // Get all the listeners for the event
        $listeners = $this->listenerProvider->getListenersForEvent($event);

        // Iterate through each listener and call it with the event
        foreach ($listeners as $listener) {
            $listener($event);

            /** @var StoppableEventInterface $event */
            // If the event is stoppable and propagation is stopped,
            //break out of the loop
            if ($isStoppable && $event->isPropagationStopped()) {
                break;
            }
        }

        // Return the event
        return $event;
    }
}
