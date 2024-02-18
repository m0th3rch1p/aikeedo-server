<?php

declare(strict_types=1);

namespace Billing\Application\Responses;

use Billing\Domain\Entities\SubscriptionEntity;
use JsonSerializable;

class SubscriptionResponse
{
    public function __construct(
        public readonly SubscriptionEntity $subscription,
        public readonly ?JsonSerializable $params
    ) {
    }
}
