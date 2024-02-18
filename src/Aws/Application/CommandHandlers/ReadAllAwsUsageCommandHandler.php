<?php

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\ReadAllAwsUsageCommand;
use Aws\Domain\Services\ReadAwsUsageService;

class ReadAllAwsUsageCommandHandler
{

    public function __construct(private ReadAwsUsageService $service)
    {
    }

    public function handle (ReadAllAwsUsageCommand $cmd) {
        return $this->service->fetchBatchRecords();
    }
}