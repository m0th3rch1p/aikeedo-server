<?php

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\ReadPlanByTitleCommand;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Services\ReadPlanService;

class ReadPlanByTitleCommandHandler
{

    public function __construct(private ReadPlanService $service)
    {
    }

    /**
     * @throws PlanNotFoundException
     */
    public function handle (ReadPlanByTitleCommand $cmd): \Billing\Domain\Entities\PlanEntity
    {
        return $this->service->findPlanByTitleOrFail($cmd->title);
    }
}