<?php

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\ReadAwsUsageCommandHandler;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

#[Handler(ReadAwsUsageCommandHandler::class)]
class ReadAwsUsageCommand
{

    public function __construct()
    {
    }
}