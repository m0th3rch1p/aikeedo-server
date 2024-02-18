<?php

declare(strict_types=1);

namespace Billing\Domain\Repositories;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\ValueObjects\ExternalId;
use Billing\Domain\ValueObjects\PaymentGateway;
use Billing\Domain\ValueObjects\Status;
use Iterator;
use Shared\Domain\Repositories\RepositoryInterface;
use Shared\Domain\ValueObjects\Id;

/** @package Billing\Domain\Repositories */
interface SubscriptionRepositoryInterface extends RepositoryInterface
{
    /**
     * Find entity by id
     *
     * @param Id $id
     * @return null|SubscriptionEntity
     */
    public function ofId(Id $id): ?SubscriptionEntity;

    /**
     * @param PaymentGateway $gateway 
     * @param ExternalId $id 
     * @return null|SubscriptionEntity 
     */
    public function ofExteranlId(
        PaymentGateway $gateway,
        ExternalId $id
    ): ?SubscriptionEntity;

    /**
     * @param Status $status 
     * @return SubscriptionRepositoryInterface 
     */
    public function filterByStatus(Status $status): self;

    /**
     * @param SubscriptionEntity $cursor
     * @return Iterator<SubscriptionEntity>
     */
    public function startingAfter(SubscriptionEntity $cursor): Iterator;

    /**
     * @param SubscriptionEntity $cursor
     * @return Iterator<SubscriptionEntity>
     */
    public function endingBefore(SubscriptionEntity $cursor): Iterator;
}
