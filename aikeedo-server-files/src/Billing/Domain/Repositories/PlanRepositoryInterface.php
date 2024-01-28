<?php

declare(strict_types=1);

namespace Billing\Domain\Repositories;

use Billing\Domain\ValueObjects\Title;
use Iterator;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\SortParameter;
use Billing\Domain\ValueObjects\Status;
use Shared\Domain\Repositories\RepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;

/**
 * @package Plan\Domain\Repositories
 */
interface PlanRepositoryInterface extends RepositoryInterface
{
    /**
     * Add new entityt to the repository
     *
     * @param PlanEntity $plan
     * @return PlanRepositoryInterface
     */
    public function add(PlanEntity $plan): self;

    /**
     * Remove the entity from the repository
     *
     * @param PlanEntity $plan
     * @return PlanRepositoryInterface
     */
    public function remove(PlanEntity $plan): self;

    /**
     * Find entity by id
     *
     * @param Id $id
     * @return null|PlanEntity
     */
    public function ofId(Id $id): ?PlanEntity;

    public function ofTitle (Title $title): ?PlanEntity;

    /**
     * @param BillingCycle $billingCycle 
     * @return PlanRepositoryInterface 
     */
    public function filterByBillingCycle(BillingCycle $billingCycle): self;

    /**
     * @param Status $status 
     * @return PlanRepositoryInterface 
     */
    public function filterByStatus(Status $status): self;

    /**
     * @param string $terms 
     * @return PlanRepositoryInterface 
     */
    public function search(string $terms): self;

    /**
     * @param SortDirection $dir
     * @param null|SortParameter $sortParameter
     * @return static
     */
    public function sort(SortDirection $dir, ?SortParameter $sortParameter = null): static;

    /**
     * @param PlanEntity $cursor
     * @return Iterator<PlanEntity>
     */
    public function startingAfter(PlanEntity $cursor): Iterator;

    /**
     * @param PlanEntity $cursor
     * @return Iterator<PlanEntity>
     */
    public function endingBefore(PlanEntity $cursor): Iterator;
}
