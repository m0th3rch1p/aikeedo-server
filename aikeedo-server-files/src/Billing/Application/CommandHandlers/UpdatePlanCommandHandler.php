<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\UpdatePlanCommand;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Exceptions\PlanIsLockedException;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Services\UpdatePlanService;

/**
 * @package Plan\Application\CommandHandlers
 */
class UpdatePlanCommandHandler
{
    /**
     * @param UpdatePlanService $service
     * @return void
     */
    public function __construct(
        private UpdatePlanService $service,
    ) {
    }

    /**
     * @param UpdatePlanCommand $cmd 
     * @return PlanEntity 
     * @throws PlanNotFoundException 
     * @throws PlanIsLockedException
     */
    public function handle(UpdatePlanCommand $cmd): PlanEntity
    {
        $plan = $this->service->findPlanOrFail($cmd->id);

        if ($cmd->title) {
            $plan->setTitle($cmd->title);
        }

        if ($cmd->price) {
            $plan->setPrice($cmd->price);
        }

        if ($cmd->billingCycle) {
            $plan->setBillingCycle($cmd->billingCycle);
        }

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

        $this->service->updatePlan($plan);
        return $plan;
    }
}
