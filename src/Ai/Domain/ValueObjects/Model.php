<?php

declare(strict_types=1);

namespace Ai\Domain\ValueObjects;

use JsonSerializable;

class Model implements JsonSerializable
{
    public readonly string $value;

    public function __construct(string $value)
    {
        $this->value = $value;
    }

    public function jsonSerialize(): string
    {
        return $this->value;
    }
}
