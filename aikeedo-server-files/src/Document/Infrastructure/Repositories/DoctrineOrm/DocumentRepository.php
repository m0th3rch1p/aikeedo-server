<?php

declare(strict_types=1);

namespace Document\Infrastructure\Repositories\DoctrineOrm;

use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Repositories\DocumentRepositoryInterface;
use Document\Domain\ValueObjects\SortParameter;
use InvalidArgumentException;
use Iterator;
use RuntimeException;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Infrastructure\Repositories\DoctrineOrm
 */
class DocumentRepository extends AbstractRepository implements DocumentRepositoryInterface
{
    private const ENTITY_CLASS = DocumentEntity::class;
    private const ALIAS = 'document';

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
    public function add(DocumentEntity $document): self
    {
        $this->em->persist($document);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function remove(DocumentEntity $document): self
    {
        $this->em->remove($document);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function ofId(Id $id): ?DocumentEntity
    {
        $object = $this->em->find(self::ENTITY_CLASS, $id);
        return $object instanceof DocumentEntity ? $object : null;
    }

    /**
     * @param Id|UserEntity $user 
     * @return DocumentRepositoryInterface 
     */
    public function filterByUser(Id|UserEntity $user): DocumentRepositoryInterface
    {
        $id = $user instanceof Id ? $user : $user->getId();

        return $this->filter(static function (QueryBuilder $qb) use ($id) {
            $qb->andWhere(self::ALIAS . '.user = :userId')
                ->setParameter(':userId', $id->getValue()->getBytes());
        });
    }

    /**
     * @param string $terms 
     * @return DocumentRepositoryInterface 
     */
    public function search(string $terms): self
    {
        return $this->filter(
            static function (QueryBuilder $qb) use ($terms) {
                $qb->andWhere(
                    $qb->expr()->orX(
                        self::ALIAS . '.title.value LIKE :search'
                    )
                )->setParameter('search', '%' . $terms . '%');
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
    public function startingAfter(DocumentEntity $cursor): Iterator
    {
        return $this->doStartingAfter(
            $cursor->getId(),
            $this->getCompareValue($cursor)
        );
    }

    /**
     * @inheritDoc
     */
    public function endingBefore(DocumentEntity $cursor): Iterator
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
            SortParameter::TITLE => 'title.value',
            default => null,
        };
    }

    /**
     * @param DocumentEntity $cursor
     * @return null|string|DateTimeInterface
     */
    private function getCompareValue(
        DocumentEntity $cursor
    ): null|string|DateTimeInterface {
        return match ($this->sortParameter) {
            SortParameter::ID => $cursor->getId()->getValue()->getBytes(),
            SortParameter::CREATED_AT => $cursor->getCreatedAt(),
            SortParameter::UPDATED_AT => $cursor->getUpdatedAt(),
            SortParameter::TITLE => $cursor->getTitle()->value,
            default => null
        };
    }
}
