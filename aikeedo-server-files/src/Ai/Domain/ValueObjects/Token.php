<?php

declare(strict_types=1);

namespace Ai\Domain\ValueObjects;

use JsonSerializable;

class Token implements JsonSerializable
{
    public function __construct(
        public readonly string $value
    ) {
    }

    public function jsonSerialize(): mixed
    {
        return $this->value;
    }
}
