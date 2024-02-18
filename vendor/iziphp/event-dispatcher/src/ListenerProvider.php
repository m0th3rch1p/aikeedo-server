<?php

declare(strict_types=1);

namespace Easy\EventDispatcher;

use Psr\EventDispatcher\ListenerProviderInterface;

/**
 * A listener provider that maps event objects to their corresponding listeners.
 *
 * @package Easy\EventDispatcher
 */
class ListenerProvider implements ListenerProviderInterface
{
    /** @var EventMapperInterface[] An array of event mappers. */
    private array $mappers = [];

    /**
     * @var array<class-string,ListenerWrapper[]>
     * An array of resolved listener wrappers for each event type.
     */
    private array $resolved = [];

    /**
     * @inheritDoc
     */
    public function getListenersForEvent(object $event): iterable
    {
        yield from $this->getResolvedListeners($event);
    }

    /**
     * Add an event mapper to the listener provider.
     *
     * @param EventMapperInterface $mapper The event mapper to add.
     * @return ListenerProvider The current listener provider instance.
     */
    public function addMapper(EventMapperInterface $mapper): self
    {
        $this->mappers[] = $mapper;
        return $this;
    }

    /**
     * Resolve the listeners for the given event and return an iterable of
     * resolved listeners.
     *
     * @param object $event The event object.
     * @return iterable<callable>
     * An iterable of resolved listeners for the given event.
     */
    private function getResolvedListeners(object $event): iterable
    {
        foreach ($this->getWrappers($event) as $wrapper) {
            $listener = $wrapper->getListener();
            yield $listener;
        }
    }

    /**
     * Get the unresolved listener wrappers that match the event type.
     *
     * @param object $event The event object.
     * @return iterable<ListenerWrapper>
     * An iterable of unresolved listener wrappers for the given event.
     */
    private function getWrappers(object $event): iterable
    {
        if (!array_key_exists($event::class, $this->resolved)) {
            $allWrappers = [];

            foreach ($this->mappers as $mapper) {
                foreach ($mapper->getListenersForEvent($event) as $wrapper) {
                    $allWrappers[] = $wrapper;
                }
            }

            $allWrappers = $this->sortWrappers(...$allWrappers);
            $this->resolved[$event::class] = $allWrappers;
        }

        yield from $this->resolved[$event::class];
    }

    /**
     * Sort the listener wrappers in descending order of priority.
     *
     * @param ListenerWrapper $wrappers The listener wrappers to sort.
     * @return ListenerWrapper[] The sorted array of listener wrappers.
     */
    private function sortWrappers(ListenerWrapper ...$wrappers): array
    {
        usort(
            $wrappers,
            function (ListenerWrapper $left, ListenerWrapper $right) {
                return $right->getPriority()->value <=> $left->getPriority()->value;
            }
        );

        return $wrappers;
    }
}
