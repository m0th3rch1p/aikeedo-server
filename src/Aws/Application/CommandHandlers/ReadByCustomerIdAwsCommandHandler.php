<?php

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\ReadByCustomerIdAwsCommand;
use Aws\Domain\Exceptions\AwsNotFoundException;
use Aws\Domain\Services\ReadAwsService;

class ReadByCustomerIdAwsCommandHandler
{
    /**
     * @param ReadAwsService $service
     * @return void
     */
    public function __construct(
        private ReadAwsService $service,
    ) {
    }

    /**
     * @throws AwsNotFoundException
     */
    public function handle (ReadByCustomerIdAwsCommand $cmd) {
        return $this->service->findAwsByCustomerId($cmd->customerId);
    }
}