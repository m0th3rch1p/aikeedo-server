<?php

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\ReadAwsUsageCommand;
use Aws\Domain\Services\ReadAwsUsageService;

class ReadAwsUsageCommandHandler
{

    public function __construct(private ReadAwsUsageService $awsUsageService)
    {
    }

    public function handler (ReadAwsUsageCommand $awsUsageCommand) {
        return $this->awsUsageService->fetchBatchRecords();
    }
}