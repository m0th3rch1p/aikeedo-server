<?php

declare(strict_types=1);

namespace Option\Infrastructure\Repositories\DoctrineOrm;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\NoResultException;
use DomainException;
use InvalidArgumentException;
use Option\Domain\Entities\OptionEntity;
use Option\Domain\Repositories\OptionRepositoryInterface;
use Option\Domain\ValueObjects\Key;
use RuntimeException;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;

/**
 * @package Option\Infrastructure\Repositories\DoctrineOrm
 */
class OptionRepository extends AbstractRepository implements
    OptionRepositoryInterface
{
    private const ENTITY_CLASS = OptionEntity::class;
    private const ALIAS = 'option';

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
    public function add(OptionEntity $option): self
    {
        $this->em->persist($option);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function remove(OptionEntity $option): self
    {
        $this->em->remove($option);
        return $this;
    }

    /**
     * @inheritDoc
     */
    public function ofId(Id $id): ?OptionEntity
    {
        $object = $this->em->find(self::ENTITY_CLASS, $id);
        return $object instanceof OptionEntity ? $object : null;
    }

    /**
     * @inheritDoc
     */
    public function ofKey(Key $key): ?OptionEntity
    {
        try {
            $object = $this->query()
                ->where(self::ALIAS . '.key.value = :key')
                ->setParameter(':key', $key->value)
                ->getQuery()
                ->getSingleResult();
        } catch (NoResultException $e) {
            return null;
        } catch (NonUniqueResultException $e) {
            throw new DomainException('More than one result found');
        }

        return $object;
    }
}
