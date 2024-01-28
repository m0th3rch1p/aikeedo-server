<?php

declare(strict_types=1);

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\UpdateAwsCommand;
use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Exceptions\AwsNotFoundException;
use Aws\Domain\Services\UpdateAwsService;

/**
 * @package Aws\Application\CommandHandlers
 */
class UpdateAwsCommandHandler
{
    /**
     * @param UpdateAwsService $service
     * @return void
     */
    public function __construct(
        private UpdateAwsService $service,
    ) {
    }

    /**
     * @param UpdateAwsCommand $cmd
     * @return AwsEntity
     * @throws AwsNotFoundException
     */
    public function handle(UpdateAwsCommand $cmd): AwsEntity
    {
        $aws = $this->service->findAwsOrFail($cmd->id);
        $this->service->updateAws($aws);
        return $aws;
    }
}
