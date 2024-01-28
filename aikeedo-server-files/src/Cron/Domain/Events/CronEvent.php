<?php

declare(strict_types=1);

namespace Cron\Domain\Events;

use Billing\Domain\Listeners\CancelExpiredSubscriptions;
use Billing\Domain\Listeners\ResetSubscriptionUsages;
use Easy\EventDispatcher\Attributes\Listener;

#[Listener(ResetSubscriptionUsages::class)]
#[Listener(CancelExpiredSubscriptions::class)]
class CronEvent
{
}
