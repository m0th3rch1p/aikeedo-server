<?php

namespace Aws\Infrastructure\Repositories\DoctrineOrm;

use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Entities\AwsUsageEntity;
use Aws\Domain\Repositories\AwsUsageRepositoryInterface;
use DateInterval;
use Doctrine\ORM\EntityManagerInterface;
use Shared\Infrastructure\Repositories\DoctrineOrm\AbstractRepository;

class AwsUsageRepository extends AbstractRepository implements  AwsUsageRepositoryInterface
{

    private const ENTITY_CLASS = AwsUsageEntity::class;
    private const ALIAS = 'aws_usage';

    public function __construct(EntityManagerInterface $em)
    {
        parent::__construct($em, self::ENTITY_CLASS, self::ALIAS);
    }

    public function add(AwsUsageEntity $awsUsageEntity): AwsUsageRepositoryInterface
    {
        // TODO: Implement add() method.
        $this->em->persist($awsUsageEntity);
        return $this;
    }

    public function fetchBatchRecords(): array
    {
        // TODO: Implement fetchBatchRecords() method.
        $interval = DateInterval::createFromDateString('1 hour');
        return $this->query()
              ->select(self::ALIAS.'.dimension', self::ALIAS.'.customerId', self::ALIAS.'.quantity', self::ALIAS.'.tag')
//            ->where(self::ALIAS.'.createdAt <= :created_at')
//            ->andWhere(self::ALIAS.'.createdAt >= :last_hr')
//            ->setParameter('created_at', new \DateTime())
//            ->setParameter('last_hr', date_sub(new \DateTime(), $interval))
            ->getQuery()
            ->getResult();
    }

    public static function getAlias (): string
    {
        return self::ALIAS;
    }
}