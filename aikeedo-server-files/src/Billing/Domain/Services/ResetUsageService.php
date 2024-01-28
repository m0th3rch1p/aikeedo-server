<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Events\SubscriptionUsageResetEvent;
use Billing\Domain\Repositories\SubscriptionRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

class ResetUsageService extends ReadSubscriptionService
{
    public function __construct(
        private SubscriptionRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher,
    ) {
        parent::__construct($repo);
    }

    public function resetUsage(SubscriptionEntity $sub)
    {
        $sub->resetUsage();

        // Call the pre update hooks
        $sub->preUpdate();

        // Update the plan in the repository
        $this->repo->flush();

        // Dispatch the subscription usage reset event
        $event = new SubscriptionUsageResetEvent($sub);
        $this->dispatcher->dispatch($event);
    }
}
