<?php

declare(strict_types=1);

namespace Category\Infrastructure\Repositories\DoctrineOrm;

use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Repositories\CategoryRepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use Category\Domain\ValueObjects\SortParameter;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use RuntimeException;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;
use Traversable;

/** @package Category\Infrastructure\Repositories\DoctrineOrm */
class CategoryRepository extends AbstractRepository implements
    CategoryRepositoryInterface
{
    private const ENTITY_CLASS = CategoryEntity::class;
    private const ALIAS = 'category';
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
    public function add(CategoryEntity $category): static
    {
        $this->em->persist($category);
        return $this;
    }

    /** @inheritDoc */
    public function remove(CategoryEntity $category): static
    {
        $this->em->remove($category);
        return $this;
    }

    /** @inheritDoc */
    public function ofId(Id $id): ?CategoryEntity
    {
        $object = $this->em->find(self::ENTITY_CLASS, $id);
        return $object instanceof CategoryEntity ? $object : null;
    }

    /** @inheritDoc */
    public function sort(
        SortDirection $dir,
        ?SortParameter $param = null
    ): static {
        $cloned = $this->doSort($dir, $this->getSortKey($param));
        $cloned->sortParameter = $param;

        return $cloned;
    }

    /** @inheritDoc */
    public function startingAfter(CategoryEntity $cursor): Traversable
    {
        return $this->doStartingAfter(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /** @inheritDoc */
    public function endingBefore(CategoryEntity $cursor): Traversable
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
     * @param CategoryEntity $cursor 
     * @return null|string|DateTimeInterface
     */
    private function getCompareValue(
        CategoryEntity $cursor
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
