<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use JsonSerializable;

/** @package User\Domain\ValueObjects */
enum Status: int implements JsonSerializable
{
    case INACTIVE = 0;
    case ACTIVE = 1;

    /** @return int  */
    public function jsonSerialize(): int
    {
        return $this->value;
    }
}
