<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Billing\Domain\ValueObjects\Title;
use Shared\Domain\ValueObjects\Id;

/**
 * @package Plan\Domain\Services
 */
class ReadPlanService
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
     * @param Id $id
     * @return PlanEntity
     * @throws PlanNotFoundException
     */
    public function findPlanOrFail(Id $id): PlanEntity
    {
        $plan = $this->repo->ofId($id);
        if (null === $plan) {
            throw new PlanNotFoundException($id);
        }

        return $plan;
    }

    public function findPlanByTitleOrFail (Title $title): PlanEntity
    {
        $plan = $this->repo->ofTitle($title);

        if (null === $plan) {
            throw new PlanNotFoundException($title);
        }

        return $plan;
    }
}
