<?php

declare(strict_types=1);

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\DeleteAwsCommand;
use Aws\Domain\Exceptions\AwsNotFoundException;
use Aws\Domain\Services\DeleteAwsService;

/**
 * @package Aws\Application\CommandHandlers
 */
class DeleteAwsCommandHandler
{
    /**
     * @param DeleteAwsService $service
     * @return void
     */
    public function __construct(
        private DeleteAwsService $service,
    ) {
    }

    /**
     * @param DeleteAwsCommand $cmd
     * @return void
     * @throws AwsNotFoundException
     */
    public function handle(DeleteAwsCommand $cmd): void
    {
        $aws = $this->service->findAwsOrFail($cmd->id);
        $this->service->deleteAws($aws);
    }
}
