<?php

declare(strict_types=1);

namespace Category\Domain\Events;

use Category\Domain\Entities\CategoryEntity;

/** @package Category\Domain\Events */
abstract class AbstractCategoryEvent
{
    /**
     * @param CategoryEntity $user 
     * @return void 
     */
    public function __construct(
        public readonly CategoryEntity $user
    ) {
    }
}
