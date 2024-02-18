<?php

declare(strict_types=1);

namespace Billing\Domain\Events;

use Billing\Domain\Entities\SubscriptionEntity;

/**
 * @package Plan\Domain\Events
 */
abstract class AbstractSubscriptionEvent
{
    /**
     * @param SubscriptionEntity $subscription
     * @return void
     */
    public function __construct(
        public readonly SubscriptionEntity $subscription,
    ) {
    }
}
