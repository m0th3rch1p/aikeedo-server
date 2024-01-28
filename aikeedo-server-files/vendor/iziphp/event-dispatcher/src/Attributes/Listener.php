<?php

declare(strict_types=1);

namespace Easy\EventDispatcher\Attributes;

use Attribute;
use Easy\EventDispatcher\Priority;

/**
 * Marks a class as a listener for an event. This attribute is intended to be
 * used in event classes.
 *
 * Example usage:
 *
 * #[Listener(ExampleEventListener::class, Priority::NORMAL)]
 * class ExampleEvent{}
 *
 * @package Easy\EventDispatcher\Attributes
 */
#[Attribute(Attribute::TARGET_CLASS | Attribute::IS_REPEATABLE)]
class Listener
{
    /**
     * Listener constructor.
     *
     * @param string $className FQCN of invokable listener class
     * @param Priority $priority
     * The priority of the listener (optional, defaults to Priority::NORMAL)
     */
    public function __construct(
        public readonly string $className,
        public readonly Priority $priority = Priority::NORMAL
    ) {
    }
}
