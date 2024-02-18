<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\CountPlansCommand;
use Billing\Domain\Repositories\PlanRepositoryInterface;

/**
 * @package Plan\Application\CommandHandlers
 */
class CountPlansCommandHandler
{
    /**
     * @param PlanRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private PlanRepositoryInterface $repo,
    ) {
    }

    /**
     * @param CountPlansCommand $cmd
     * @return int
     */
    public function handle(CountPlansCommand $cmd): int
    {
        $plans = $this->repo;

        if ($cmd->status) {
            $plans = $plans->filterByStatus($cmd->status);
        }

        if ($cmd->billingCycle) {
            $plans = $plans->filterByBillingCycle($cmd->billingCycle);
        }

        if ($cmd->query) {
            $plans = $plans->search($cmd->query);
        }

        return $plans->count();
    }
}
