<?php

declare(strict_types=1);

namespace Billing\Domain\Services;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Exceptions\SubscriptionNotFoundException;
use Billing\Domain\Repositories\SubscriptionRepositoryInterface;
use Billing\Domain\ValueObjects\ExternalId;
use Billing\Domain\ValueObjects\PaymentGateway;
use Shared\Domain\ValueObjects\Id;

class ReadSubscriptionService
{

    public function __construct(
        private SubscriptionRepositoryInterface $repo,
    ) {
    }

    /**
     * @param Id $id 
     * @return SubscriptionEntity 
     * @throws SubscriptionNotFoundException 
     */
    public function findSubscriptionById(Id $id): SubscriptionEntity
    {
        $sub = $this->repo->ofId($id);

        if (null === $sub) {
            throw SubscriptionNotFoundException::createWithId($id);
        }

        return $sub;
    }

    /**
     * @param PaymentGateway $gateway 
     * @param ExternalId $id 
     * @return SubscriptionEntity 
     * @throws SubscriptionNotFoundException 
     */
    public function findSubscriptionByExternalId(
        PaymentGateway $gateway,
        ExternalId $id
    ): SubscriptionEntity {
        $sub = $this->repo->ofExteranlId($gateway, $id);

        if (null === $sub) {
            throw SubscriptionNotFoundException::createWithExternalId($gateway, $id);
        }

        return $sub;
    }
}
