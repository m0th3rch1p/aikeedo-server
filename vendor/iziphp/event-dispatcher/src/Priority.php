<?php

declare(strict_types=1);

namespace Easy\EventDispatcher;

/**
 * The priority levels for event listeners.
 *
 * @package Easy\EventDispatcher
 */
enum Priority: int
{
    /**
     * Low priority.
     */
    case LOW = 0;

    /**
     * Normal priority.
     */
    case NORMAL = 50;

    /**
     * High priority.
     */
    case HIGH = 100;
}
