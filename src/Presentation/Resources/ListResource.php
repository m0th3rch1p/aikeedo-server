<?php

declare(strict_types=1);

namespace Presentation\Resources;

use JsonSerializable;

/** @package Shared\Presentation\Resources */
class ListResource implements JsonSerializable
{
    /**
     * @param array<JsonSerializable> $data
     * @return void
     */
    public function __construct(
        private array $data = []
    ) {
    }

    /**
     * @param JsonSerializable $data
     * @return void
     */
    public function pushData(JsonSerializable $data): void
    {
        $this->data[] = $data;
    }

    /** @inheritDoc */
    public function jsonSerialize(): mixed
    {
        return [
            'object' => 'list',
            'data' => $this->data
        ];
    }
}
