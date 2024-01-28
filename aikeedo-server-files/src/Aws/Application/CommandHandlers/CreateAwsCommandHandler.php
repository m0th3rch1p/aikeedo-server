<?php

declare(strict_types=1);

namespace Aws\Application\CommandHandlers;

use Aws\Application\Commands\CreateAwsCommand;
use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\Services\CreateAwsService;

/**
 * @package Aws\Application\CommandHandlers
 */
class CreateAwsCommandHandler
{
    /**
     * @param CreateAwsService $service
     * @return void
     */
    public function __construct(
        private CreateAwsService $service,
    ) {
    }

    /**
     * @param CreateAwsCommand $cmd
     * @return AwsEntity
     */
    public function handle(CreateAwsCommand $cmd): AwsEntity
    {
        $aws = new AwsEntity($cmd->customerId, $cmd->dimension);
        $this->service->createAws($aws);
        return $aws;
    }
}
