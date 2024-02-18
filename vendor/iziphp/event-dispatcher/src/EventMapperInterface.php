<?php

declare(strict_types=1);

namespace Easy\EventDispatcher;

/**
 * Interface for event mappers that map event objects to listener wrappers.
 *
 * @package Easy\EventDispatcher
 */
interface EventMapperInterface
{
    /**
     * Get the listener wrappers for the given event.
     *
     * @param object $event The event object.
     * @return iterable<ListenerWrapper>
     * An iterable of listener wrappers for the given event.
     */
    public function getListenersForEvent(object $event): iterable;
}
