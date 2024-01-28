<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Events\PlanCreatedEvent;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Plan\Domain\Services
 */
class CreatePlanService
{
    /**
     * @param PlanRepositoryInterface $repo
     * @param EventDispatcherInterface $dispatcher
     * @return void
     */
    public function __construct(
        private PlanRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher,
    ) {
    }

    /**
     * @param PlanEntity $plan
     * @return void
     */
    public function createPlan(PlanEntity $plan)
    {
        // Add the plan to the repository
        $this->repo
            ->add($plan)
            ->flush();

        // Dispatch the plan created event
        $event = new PlanCreatedEvent($plan);
        $this->dispatcher->dispatch($event);
    }
}
