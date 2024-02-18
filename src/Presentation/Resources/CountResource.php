<?php

declare(strict_types=1);

namespace Presentation\Resources;

use JsonSerializable;

/** @package Presentation\Resources */
class CountResource implements JsonSerializable
{
    public function __construct(private int $count)
    {
    }

    public function jsonSerialize(): mixed
    {
        return [
            'count' => $this->count,
        ];
    }
}
