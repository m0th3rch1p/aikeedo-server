<?php

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\ReadAllAwsUsageCommandHandler;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

#[Handler(ReadAllAwsUsageCommandHandler::class)]
class ReadAllAwsUsageCommand
{

    public function __construct()
    {
    }
}