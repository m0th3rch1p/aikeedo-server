<?php

declare(strict_types=1);

namespace Option\Domain\Events;

use Option\Domain\Entities\OptionEntity;

/**
 * @package Option\Domain\Events
 */
abstract class AbstractOptionEvent
{
    /**
     * @param OptionEntity $option
     * @return void
     */
    public function __construct(
        public readonly OptionEntity $option,
    ) {
    }
}
