<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Events\SubscriptionActivatedEvent;
use LogicException;
use Psr\EventDispatcher\EventDispatcherInterface;
use User\Domain\Repositories\UserRepositoryInterface;

/** @package Billing\Domain\Services */
class ActivateSubscriptionService
{
    /**
     * @param UserRepositoryInterface $userRepo 
     * @param EventDispatcherInterface $dispatcher 
     * @return void 
     */
    public function __construct(
        private UserRepositoryInterface $userRepo,
        private EventDispatcherInterface $dispatcher
    ) {
    }

    /**
     * @param SubscriptionEntity $subscription 
     * @return void 
     * @throws LogicException 
     */
    public function activateSubscription(SubscriptionEntity $subscription): void
    {
        $subscription->activate();

        // Persist changes
        $this->userRepo
            ->flush();

        // Dispatch the subscription created event
        $event = new SubscriptionActivatedEvent($subscription);
        $this->dispatcher->dispatch($event);
    }
}
