<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Repositories\DoctrineOrm;

use Billing\Domain\ValueObjects\Title;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\NoResultException;
use Doctrine\ORM\QueryBuilder;
use InvalidArgumentException;
use Iterator;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\SortParameter;
use Billing\Domain\ValueObjects\Status;
use RuntimeException;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;

/**
 * @package Plan\Infrastructure\Repositories\DoctrineOrm
 */
class PlanRepository extends AbstractRepository implements PlanRepositoryInterface
{
    private const ENTITY_CLASS = PlanEntity::class;
    private const ALIAS = 'plan';

    private ?SortParameter $sortParameter = null;

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
    public function add(PlanEntity $plan): self
    {
        $this->em->persist($plan);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function remove(PlanEntity $plan): self
    {
        $this->em->remove($plan);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function ofId(Id $id): ?PlanEntity
    {
        $object = $this->em->find(self::ENTITY_CLASS, $id);
        return $object instanceof PlanEntity ? $object : null;
    }

    /**
     * @throws NonUniqueResultException
     */
    public function ofTitle(Title $title): ?PlanEntity
    {
        // TODO: Implement ofTitle() method.
        try {
            return $this->query()
                ->where(self::ALIAS . '.title.value = :title')
                ->setParameter(':title', $title->value)
                ->getQuery()
                ->getSingleResult();
        } catch (NoResultException $e) {
            return null;
        }
    }

    /**
     * @inheritDoc
     */
    public function filterByBillingCycle(BillingCycle $billingCycle): PlanRepositoryInterface
    {
        return $this->filter(
            static function (QueryBuilder $qb) use ($billingCycle) {
                $qb->andWhere(self::ALIAS . '.billingCycle = :billing_cycle')
                    ->setParameter(
                        ':billing_cycle',
                        $billingCycle->value,
                        Types::STRING
                    );
            }
        );
    }

    /**
     * @inheritDoc
     */
    public function filterByStatus(Status $status): PlanRepositoryInterface
    {
        return $this->filter(static function (QueryBuilder $qb) use ($status) {
            $qb->andWhere(self::ALIAS . '.status = :status')
                ->setParameter(':status', $status->value, Types::SMALLINT);
        });
    }

    /**
     * @inheritDoc
     */
    public function search(string $terms): PlanRepositoryInterface
    {
        return $this->filter(
            static function (QueryBuilder $qb) use ($terms) {
                $qb->andWhere(
                    $qb->expr()->orX(
                        self::ALIAS . '.title.value LIKE :search',
                        self::ALIAS . '.description.value LIKE :search'
                    )
                )->setParameter('search', $terms . '%');
            }
        );
    }

    /**
     * @inheritDoc
     */
    public function sort(
        SortDirection $dir,
        ?SortParameter $sortParameter = null
    ): static {
        $cloned = $this->doSort($dir, $this->getSortKey($sortParameter));
        $cloned->sortParameter = $sortParameter;

        return $cloned;
    }

    /**
     * @inheritDoc
     */
    public function startingAfter(PlanEntity $cursor): Iterator
    {
        return $this->doStartingAfter(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /**
     * @inheritDoc
     */
    public function endingBefore(PlanEntity $cursor): Iterator
    {
        return $this->doEndingBefore(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /**
     * @param null|SortParameter $param
     * @return string
     */
    private function getSortKey(?SortParameter $param): ?string
    {
        return match ($param) {
            SortParameter::ID => 'id.value',
            SortParameter::CREATED_AT => 'createdAt',
            SortParameter::UPDATED_AT => 'updatedAt',
            SortParameter::PRICE => 'price.value',
            SortParameter::SUPERIORITY => 'superiority.value',
            default => null,
        };
    }

    /**
     * @param PlanEntity $cursor
     * @return null|string|DateTimeInterface
     */
    private function getCompareValue(PlanEntity $cursor): null|string|DateTimeInterface
    {
        return match ($this->sortParameter) {
            SortParameter::ID => $cursor->getId()->getValue()->getBytes(),
            SortParameter::CREATED_AT => $cursor->getCreatedAt(),
            SortParameter::UPDATED_AT => $cursor->getUpdatedAt(),
            SortParameter::PRICE => (string)$cursor->getPrice()->value,
            SortParameter::SUPERIORITY => $cursor->getSuperiority()->value,
            default => null
        };
    }
}
