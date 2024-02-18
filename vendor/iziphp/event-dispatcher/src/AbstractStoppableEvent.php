<?php

declare(strict_types=1);

// Defines a namespace for the class.
namespace Easy\EventDispatcher;

// Imports the StoppableEventInterface from Psr namespace.
use Psr\EventDispatcher\StoppableEventInterface;

/**
 * This is an abstract class called "AbstractStoppableEvent".
 * It implements the StoppableEventInterface and defines two methods.
 *
 * @package Easy\EventDispatcher
 */
abstract class AbstractStoppableEvent implements StoppableEventInterface
{
    /**
     * Propagation indicator of the event.
     * True means propagation must be stopped.
     *
     * @var boolean
     */
    private bool $isPropagationStopped = false;

    /**
     * Checks if the propagation has stopped.
     * Implements the method from StoppableEventInterface.
     *
     * @return bool
     * Returns true if the propagation has stopped, false otherwise.
     */
    public function isPropagationStopped(): bool
    {
        return $this->isPropagationStopped;
    }

    /**
     * Stops the propagation of the event.
     *
     * @return void Returns nothing.
     */
    public function stopPropagation(): void
    {
        $this->isPropagationStopped = true;
    }
}
