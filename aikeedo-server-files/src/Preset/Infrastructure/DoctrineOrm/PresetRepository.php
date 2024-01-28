<?php

declare(strict_types=1);

namespace Preset\Infrastructure\DoctrineOrm;

use Category\Domain\Entities\CategoryEntity;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\NoResultException;
use Doctrine\ORM\QueryBuilder;
use DomainException;
use InvalidArgumentException;
use Iterator;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Repositories\PresetRepositoryInterface;
use Preset\Domain\ValueObjects\SortParameter;
use Preset\Domain\ValueObjects\Status;
use Preset\Domain\ValueObjects\Template;
use Preset\Domain\ValueObjects\Type;
use RuntimeException;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;

/** @package Preset\Infrastructure\DoctrineOrm */
class PresetRepository extends AbstractRepository implements
    PresetRepositoryInterface
{
    private const ENTITY_CLASS = PresetEntity::class;
    private const ALIAS = 'preset';
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

    /** @inheritDoc */
    public function add(PresetEntity $preset): static
    {
        $this->em->persist($preset);
        return $this;
    }

    /** @inheritDoc */
    public function remove(PresetEntity $preset): static
    {
        $this->em->remove($preset);
        return $this;
    }

    /** @inheritDoc */
    public function ofId(Id $id): ?PresetEntity
    {
        $object = $this->em->find(self::ENTITY_CLASS, $id);
        return $object instanceof PresetEntity ? $object : null;
    }

    /** @inheritDoc */
    public function ofTemplate(Template $template): ?PresetEntity
    {
        if ($template->value === null) {
            return null;
        }

        try {
            $object = $this->query()
                ->where(self::ALIAS . '.template.value = :template')
                ->setParameter(':template', $template->value)
                ->getQuery()
                ->getSingleResult();
        } catch (NoResultException $e) {
            return null;
        } catch (NonUniqueResultException $e) {
            throw new DomainException('More than one result found');
        }

        return $object;
    }

    /** @inheritDoc */
    public function filterByStatus(Status $status): static
    {
        return $this->filter(static function (QueryBuilder $qb) use ($status) {
            $qb->andWhere(self::ALIAS . '.status = :status')
                ->setParameter(':status', $status->value, Types::INTEGER);
        });
    }

    /** @inheritDoc */
    public function filterByType(Type $type): static
    {
        return $this->filter(static function (QueryBuilder $qb) use ($type) {
            $qb->andWhere(self::ALIAS . '.type = :type')
                ->setParameter(':type', $type->value, Types::STRING);
        });
    }

    /** @inheritDoc */
    public function filterByLock(bool $isLocked): static
    {
        return $this->filter(static function (QueryBuilder $qb) use ($isLocked) {
            $qb->andWhere(self::ALIAS . '.isLocked = :isLocked')
                ->setParameter(':isLocked', $isLocked, Types::BOOLEAN);
        });
    }

    /** @inheritDoc */
    public function filterByCategory(Id|CategoryEntity $category): static
    {
        $id = $category instanceof CategoryEntity
            ? $category->getId()
            : $category;

        return $this->filter(static function (QueryBuilder $qb) use ($id) {
            $qb->andWhere(self::ALIAS . '.category = :categoryId')
                ->setParameter(
                    ':categoryId',
                    $id->getValue()->getBytes(),
                    Types::STRING
                );
        });
    }

    /** @inheritDoc */
    public function search(string $query): static
    {
        return $this->filter(
            static function (QueryBuilder $qb) use ($query) {
                $qb->andWhere(
                    $qb->expr()->orX(
                        self::ALIAS . '.title.value LIKE :search',
                        self::ALIAS . '.description.value LIKE :search'
                    )
                )->setParameter('search', '%' . $query . '%');
            }
        );
    }

    /** @inheritDoc */
    public function sort(
        SortDirection $dir,
        ?SortParameter $sortParameter = null
    ): static {
        $cloned = $this->doSort($dir, $this->getSortKey($sortParameter));
        $cloned->sortParameter = $sortParameter;

        return $cloned;
    }

    /** @inheritDoc */
    public function startingAfter(PresetEntity $cursor): Iterator
    {
        return $this->doStartingAfter(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /** @inheritDoc */
    public function endingBefore(PresetEntity $cursor): Iterator
    {
        return $this->doEndingBefore(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /**
     * @param SortParameter $param 
     * @return null|string 
     */
    private function getSortKey(
        ?SortParameter $param
    ): ?string {
        return match ($param) {
            SortParameter::ID => 'id.value',
            SortParameter::TITLE => 'title.value',
            SortParameter::CREATED_AT => 'createdAt',
            SortParameter::UPDATED_AT => 'updatedAt',
            default => null
        };
    }

    /**
     * @param PresetEntity $cursor 
     * @return null|string|DateTimeInterface
     */
    private function getCompareValue(
        PresetEntity $cursor
    ): null|string|DateTimeInterface {
        return match ($this->sortParameter) {
            SortParameter::ID => $cursor->getId()->getValue()->getBytes(),
            SortParameter::TITLE => $cursor->getTitle()->value,
            SortParameter::CREATED_AT => $cursor->getCreatedAt(),
            SortParameter::UPDATED_AT => $cursor->getUpdatedAt(),
            default => null
        };
    }
}
