<?php

namespace Aws\Domain\Services;

use Aws\Domain\Entities\AwsUsageEntity;
use Aws\Domain\Repositories\AwsUsageRepositoryInterface;
use Easy\EventDispatcher\EventDispatcher;

class CreateAwsUsageService
{

    public function __construct(private EventDispatcher $dispatcher, private AwsUsageRepositoryInterface $repo)
    {
    }

    public function add (AwsUsageEntity $awsUsageEntity): AwsUsageRepositoryInterface
    {
        return $this->repo->add($awsUsageEntity);
    }

    public function fetch () {

    }
}