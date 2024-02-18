<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\CreatePlanCommand;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Services\CreatePlanService;

/**
 * @package Plan\Application\CommandHandlers
 */
class CreatePlanCommandHandler
{
    /**
     * @param CreatePlanService $service
     * @return void
     */
    public function __construct(
        private CreatePlanService $service,
    ) {
    }

    /**
     * @param CreatePlanCommand $cmd 
     * @return PlanEntity 
     */
    public function handle(CreatePlanCommand $cmd): PlanEntity
    {
        $plan = new PlanEntity(
            $cmd->title,
            $cmd->price,
            $cmd->billingCycle
        );

        if ($cmd->description) {
            $plan->setDescription($cmd->description);
        }

        if ($cmd->tokenCredit) {
            $plan->setTokenCredit($cmd->tokenCredit);
        }

        if ($cmd->imageCredit) {
            $plan->setImageCredit($cmd->imageCredit);
        }

        if ($cmd->audioCredit) {
            $plan->setAudioCredit($cmd->audioCredit);
        }

        if ($cmd->superiority) {
            $plan->setSuperiority($cmd->superiority);
        }

        if ($cmd->status) {
            $plan->setStatus($cmd->status);
        }

        if ($cmd->isFeatured) {
            $plan->setIsFeatured($cmd->isFeatured);
        }

        if ($cmd->icon) {
            $plan->setIcon($cmd->icon);
        }

        if ($cmd->featureList) {
            $plan->setFeatureList($cmd->featureList);
        }

        $this->service->createPlan($plan);
        return $plan;
    }
}
