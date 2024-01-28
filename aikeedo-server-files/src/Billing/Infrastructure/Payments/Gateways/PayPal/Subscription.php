<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Payments\Gateways\PayPal;

use JsonSerializable;

class Subscription implements JsonSerializable
{
    public readonly string $id;
    public readonly string $status;
    public readonly string $planId;

    public function __construct(object $subs)
    {
        $this->id = $subs->id;
        $this->status = $subs->status;
        $this->planId = $subs->plan_id;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'plan_id' => $this->planId,
        ];
    }
}
