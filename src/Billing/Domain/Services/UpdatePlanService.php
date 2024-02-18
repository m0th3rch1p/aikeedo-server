<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Events\PlanUpdatedEvent;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Plan\Domain\Services
 */
class UpdatePlanService extends ReadPlanService
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
    public function updatePlan(PlanEntity $plan)
    {
        // Call the pre update hooks
        $plan->preUpdate();

        // Update the plan in the repository
        $this->repo->flush();

        // Dispatch the plan updated event
        $event = new PlanUpdatedEvent($plan);
        $this->dispatcher->dispatch($event);
    }
}
