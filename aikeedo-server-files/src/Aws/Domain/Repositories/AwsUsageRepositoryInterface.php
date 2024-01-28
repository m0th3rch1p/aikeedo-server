<?php

namespace Aws\Domain\Repositories;


use Aws\Domain\Entities\AwsUsageEntity;
use Shared\Domain\Repositories\RepositoryInterface;

interface AwsUsageRepositoryInterface extends RepositoryInterface
{
    public function add (AwsUsageEntity $awsUsageEntity): self;

    public function fetchBatchRecords ();
}