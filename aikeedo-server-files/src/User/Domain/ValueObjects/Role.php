<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use JsonSerializable;

/** @package User\Domain\ValueObjects */
enum Role: int implements JsonSerializable
{
    case USER = 0;
    case ADMIN = 1;

    /** @return int  */
    public function jsonSerialize(): int
    {
        return $this->value;
    }
}
