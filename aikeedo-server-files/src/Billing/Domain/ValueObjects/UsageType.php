<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use JsonSerializable;

/** @package Ai\Domain\ValueObjects */
enum UsageType: int implements JsonSerializable
{
    case TOKEN = 0;
    case IMAGE = 1;
    case AUDIO = 2;

    /** @return int  */
    public function jsonSerialize(): int
    {
        return $this->value;
    }
}
