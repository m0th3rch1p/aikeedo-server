<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

use JsonSerializable;

/** @package Preset\Domain\Placeholder */
interface PlaceholderInterface extends JsonSerializable
{
    public function jsonSerialize(): array;
}
