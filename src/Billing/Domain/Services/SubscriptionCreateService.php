<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Events\SubscriptionCreatedEvent;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;
use User\Domain\Repositories\UserRepositoryInterface;

/** @package Billing\Domain\Services */
class SubscriptionCreateService extends ReadPlanService
{
    /**
     * @param UserRepositoryInterface $userRepo 
     * @param PlanRepositoryInterface $planRepo 
     * @param EventDispatcherInterface $dispatcher 
     * @return void 
     */
    public function __construct(
        private UserRepositoryInterface $userRepo,
        private PlanRepositoryInterface $planRepo,
        private EventDispatcherInterface $dispatcher
    ) {
        parent::__construct($planRepo);
    }

    /**
     * @param SubscriptionEntity $subscription 
     * @return void 
     */
    public function createSubscription(SubscriptionEntity $subscription): void
    {
        // Add the subscription to the repository
        $this->userRepo
            ->flush();

        // Dispatch the subscription created event
        $event = new SubscriptionCreatedEvent($subscription);
        $this->dispatcher->dispatch($event);
    }
}
