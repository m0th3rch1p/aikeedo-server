<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Payments\Gateways\PayPal;

use JsonSerializable;

class Plan implements JsonSerializable
{
    public function __construct(
        private readonly string $id
    ) {
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id
        ];
    }
}
