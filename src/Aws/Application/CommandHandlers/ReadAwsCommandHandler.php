<?php

declare(strict_types=1);

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\ReadAwsCommand;
use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Exceptions\AwsNotFoundException;
use Aws\Domain\Services\ReadAwsService;

/**
 * @package Aws\Application\CommandHandlers
 */
class ReadAwsCommandHandler
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
     * @param ReadAwsCommand $cmd
     * @return AwsEntity
     * @throws AwsNotFoundException
     */
    public function handle(ReadAwsCommand $cmd): AwsEntity
    {
        return $this->service->findAwsOrFail($cmd->id);
    }
}
