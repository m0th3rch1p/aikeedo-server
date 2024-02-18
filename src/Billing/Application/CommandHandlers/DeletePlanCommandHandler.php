<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\DeletePlanCommand;
use Billing\Domain\Exceptions\PlanIsLockedException;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Services\DeletePlanService;

/**
 * @package Plan\Application\CommandHandlers
 */
class DeletePlanCommandHandler
{
    /**
     * @param DeletePlanService $service
     * @return void
     */
    public function __construct(
        private DeletePlanService $service,
    ) {
    }

    /**
     * @param DeletePlanCommand $cmd 
     * @return void 
     * @throws PlanNotFoundException 
     * @throws PlanIsLockedException 
     */
    public function handle(DeletePlanCommand $cmd): void
    {
        $plan = $this->service->findPlanOrFail($cmd->id);
        $this->service->deletePlan($plan);
    }
}
