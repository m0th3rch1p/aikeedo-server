<?php

declare(strict_types=1);

namespace Aws\Domain\Services;

use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Exceptions\AwsNotFoundException;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\StringValue;

/**
 * @package Aws\Domain\Services
 */
class ReadAwsService
{
    /**
     * @param AwsRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private AwsRepositoryInterface $repo,
    ) {
    }

    /**
     * @param Id $id
     * @return AwsEntity
     * @throws AwsNotFoundException
     */
    public function findAwsOrFail(Id $id)
    {
        $aws = $this->repo->ofId($id);
        if (null === $aws) {
            throw new AwsNotFoundException($id->getValue()->toString());
        }

        return $aws;
    }

    public function findAwsByCustomerId (string $customerId) {
        return $this->repo->ofCustomerId($customerId);
    }

    /**
     * @throws AwsNotFoundException
     */
    public function findAwsByCustomerIdOrFail (string $customerId) {
        $awsResults = $this->repo->ofCustomerId($customerId);
        if (!$awsResults) throw new AwsNotFoundException($customerId);

        return $awsResults[0];
    }

    public function fetchAll () {
        return $this->repo->fetchAll();
    }
}
