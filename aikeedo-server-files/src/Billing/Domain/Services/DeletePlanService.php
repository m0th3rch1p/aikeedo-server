<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Events\PlanDeletedEvent;
use Billing\Domain\Exceptions\PlanIsLockedException;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Plan\Domain\Services
 */
class DeletePlanService extends ReadPlanService
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
        parent::__construct($repo);
    }

    /**
     * @param PlanEntity $plan
     * @return void
     */
    public function deletePlan(PlanEntity $plan)
    {
        if ($plan->isLocked()) {
            throw new PlanIsLockedException($plan);
        }

        // Delete the plan from the repository
        $this->repo
            ->remove($plan)
            ->flush();

        // Dispatch the plan deleted event
        $event = new PlanDeletedEvent($plan);
        $this->dispatcher->dispatch($event);
    }
}
