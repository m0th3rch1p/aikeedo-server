<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Repositories\DoctrineOrm;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Repositories\SubscriptionRepositoryInterface;
use Billing\Domain\ValueObjects\PaymentGateway;
use Billing\Domain\ValueObjects\ExternalId;
use Billing\Domain\ValueObjects\Status;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\NoResultException;
use Doctrine\ORM\QueryBuilder;
use DomainException;
use InvalidArgumentException;
use Iterator;
use LogicException;
use Psr\Cache\InvalidArgumentException as CacheInvalidArgumentException;
use RuntimeException;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;

/** @package Billing\Infrastructure\Repositories\DoctrineOrm */
class SubscriptionRepository extends AbstractRepository implements
    SubscriptionRepositoryInterface
{
    private const ENTITY_CLASS = SubscriptionEntity::class;
    private const ALIAS = 'subscription';

    /**
     * @param EntityManagerInterface $em 
     * @return void 
     * @throws InvalidArgumentException 
     * @throws RuntimeException 
     */
    public function __construct(EntityManagerInterface $em)
    {
        parent::__construct($em, self::ENTITY_CLASS, self::ALIAS);
    }

    /**
     * @inheritDoc
     */
    public function ofId(Id $id): ?SubscriptionEntity
    {
        $object = $this->em->find(self::ENTITY_CLASS, $id);
        return $object instanceof SubscriptionEntity ? $object : null;
    }

    /**
     * @inheritDoc
     * @throws DomainException 
     * @throws InvalidArgumentException 
     * @throws RuntimeException 
     */
    public function ofExteranlId(
        PaymentGateway $gateway,
        ExternalId $id
    ): ?SubscriptionEntity {
        try {
            $object = $this->query()
                ->where(self::ALIAS . '.paymentGateway.value = :payment_gateway')
                ->andWhere(self::ALIAS . '.externalId.value = :external_id')
                ->setParameter(':payment_gateway', $gateway->value)
                ->setParameter(':external_id', $id->value)
                ->getQuery()
                ->getSingleResult();
        } catch (NoResultException $e) {
            return null;
        } catch (NonUniqueResultException $e) {
            throw new DomainException('More than one result found');
        }


        return $object;
    }

    /**
     * @inheritDoc
     */
    public function filterByStatus(
        Status $status
    ): SubscriptionRepositoryInterface {
        return $this->filter(static function (QueryBuilder $qb) use ($status) {
            $qb->andWhere(self::ALIAS . '.status = :status')
                ->setParameter(':status', $status->value, Types::SMALLINT);
        });
    }

    /**
     * @inheritDoc
     * @throws LogicException 
     * @throws CacheInvalidArgumentException 
     * @throws ORMException 
     */
    public function startingAfter(SubscriptionEntity $cursor): Iterator
    {
        return $this->doStartingAfter(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /**
     * @inheritDoc
     */
    public function endingBefore(SubscriptionEntity $cursor): Iterator
    {
        return $this->doEndingBefore(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /**
     * @param SubscriptionEntity $cursor 
     * @return string 
     */
    private function getCompareValue(SubscriptionEntity $cursor): string
    {
        return $cursor->getId()->getValue()->getBytes();
    }
}
