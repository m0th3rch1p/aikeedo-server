<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

use JsonSerializable;

/** @package Preset\Domain\Placeholder */
class Option implements JsonSerializable
{
    public function __construct(
        public readonly string $value,
        public readonly string $label
    ) {
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        return [
            'value' => $this->value,
            'label' => $this->label
        ];
    }
}
