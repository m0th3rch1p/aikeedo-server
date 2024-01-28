<?php

declare(strict_types=1);

namespace Aws\Infrastructure\Repositories\DoctrineOrm;

use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Aws\Domain\ValueObjects\SortParameter;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use Iterator;
use RuntimeException;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Domain\ValueObjects\StringValue;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;

/**
 * @package Aws\Infrastructure\Repositories\DoctrineOrm
 */
class AwsRepository extends AbstractRepository implements AwsRepositoryInterface
{
    private const ENTITY_CLASS = AwsEntity::class;
    private const ALIAS = 'aws';

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
    public function add(AwsEntity $aws): self
    {
        $this->em->persist($aws);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function remove(AwsEntity $aws): self
    {
        $this->em->remove($aws);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function ofId(Id $id): ?AwsEntity
    {
        $object = $this->em->find(self::ENTITY_CLASS, $id);
        return $object instanceof AwsEntity ? $object : null;
    }

    public function ofCustomerId(StringValue $customerId): array
    {
       return $this->em->getRepository(self::ENTITY_CLASS)->findBy(criteria: ['customer_id' => $customerId]);
    }

    /**
     * @inheritDoc
     */
    public function sort(SortDirection $dir, ?SortParameter $sortParameter = null): static
    {
        $cloned = $this->doSort($dir, $this->getSortKey($sortParameter));
        $cloned->sortParameter = $sortParameter;

        return $cloned;
    }

    /**
     * @inheritDoc
     */
    public function startingAfter(AwsEntity $cursor): Iterator
    {
        return $this->doStartingAfter(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /**
     * @inheritDoc
     */
    public function endingBefore(AwsEntity $cursor): Iterator
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
            default => null,
        };
    }

    /**
     * @param AwsEntity $cursor
     * @return null|string|DateTimeInterface
     */
    private function getCompareValue(AwsEntity $cursor): null|string|DateTimeInterface
    {
        return match ($this->sortParameter) {
            SortParameter::ID => $cursor->getId()->getValue()->getBytes(),
            SortParameter::CREATED_AT => $cursor->getCreatedAt(),
            SortParameter::UPDATED_AT => $cursor->getUpdatedAt(),
            default => null
        };
    }
}
