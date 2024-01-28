<?php

declare(strict_types=1);

namespace User\Domain\Events;

use User\Domain\Entities\UserEntity;

/** @package User\Domain\Events */
abstract class AbstractUserEvent
{
    public function __construct(
        public readonly UserEntity $user
    ) {
    }
}
