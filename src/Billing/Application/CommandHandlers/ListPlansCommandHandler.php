<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\ListPlansCommand;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Billing\Domain\Services\ReadPlanService;
use Shared\Domain\ValueObjects\CursorDirection;
use Traversable;

/**
 * @package Plan\Application\CommandHandlers
 */
class ListPlansCommandHandler
{
    /**
     * @param PlanRepositoryInterface $repo
     * @param ReadPlanService $service
     * @return void
     */
    public function __construct(
        private PlanRepositoryInterface $repo,
        private ReadPlanService $service,
    ) {
    }

    /**
     * @param ListPlansCommand $cmd
     * @return Traversable<PlanEntity>
     * @throws PlanNotFoundException
     */
    public function handle(ListPlansCommand $cmd): \Traversable
    {
        $cursor = $cmd->cursor
            ? $this->service->findPlanOrFail($cmd->cursor)
            : null;

        $plans = $this->repo
            ->sort($cmd->sortDirection, $cmd->sortParameter);

        if ($cmd->status) {
            $plans = $plans->filterByStatus($cmd->status);
        }

        if ($cmd->billingCycle) {
            $plans = $plans->filterByBillingCycle($cmd->billingCycle);
        }

        if ($cmd->query) {
            $plans = $plans->search($cmd->query);
        }

        if ($cmd->maxResults) {
            $plans = $plans->setMaxResults($cmd->maxResults);
        }

        if ($cursor) {
            if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {
                return $plans = $plans->endingBefore($cursor);
            }

            return $plans->startingAfter($cursor);
        }

        return $plans;
    }
}
