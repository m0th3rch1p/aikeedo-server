<?php

declare(strict_types=1);

namespace Preset\Domain\ValueObjects;

use JsonSerializable;

/** @package Preset\Domain\ValueObjects */
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
