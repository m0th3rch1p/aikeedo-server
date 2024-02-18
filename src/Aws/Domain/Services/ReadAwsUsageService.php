<?php

namespace Aws\Domain\Services;

use Aws\Domain\Repositories\AwsUsageRepositoryInterface;

class ReadAwsUsageService
{
    public function __construct(private AwsUsageRepositoryInterface $repo)
    {
    }

    public function fetchBatchRecords () {
        return $this->repo->fetchBatchRecords();
    }
}