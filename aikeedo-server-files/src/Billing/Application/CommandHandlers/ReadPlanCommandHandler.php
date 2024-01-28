<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\ReadPlanCommand;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Services\ReadPlanService;

/**
 * @package Plan\Application\CommandHandlers
 */
class ReadPlanCommandHandler
{
    /**
     * @param ReadPlanService $service
     * @return void
     */
    public function __construct(
        private ReadPlanService $service,
    ) {
    }

    /**
     * @param ReadPlanCommand $cmd
     * @return PlanEntity
     * @throws PlanNotFoundException
     */
    public function handle(ReadPlanCommand $cmd): PlanEntity
    {
        return $this->service->findPlanOrFail($cmd->id);
    }
}
