<?php

declare(strict_types=1);

namespace Ai\Domain\ValueObjects;

use JsonSerializable;

enum Gender: string implements JsonSerializable
{
    case UNKNOWN = '';
    case MALE = 'male';
    case FEMALE = 'female';
    case NEUTRAL = 'neutral';

    public function jsonSerialize(): string
    {
        return $this->value;
    }
}
