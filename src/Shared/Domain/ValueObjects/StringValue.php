<?php

declare(strict_types=1);

namespace Shared\Domain\ValueObjects;

use JsonSerializable;

/** @package Settings\Domain\ValueObjects */
class StringValue implements JsonSerializable
{
    public readonly string $value;

    /**
     * @param string $value 
     * @return void 
     */
    public function __construct(string $value)
    {
        $this->value = $value;
    }

    /** @inheritDoc */
    public function jsonSerialize(): string
    {
        return $this->value;
    }
}
