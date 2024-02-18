<?php

declare(strict_types=1);

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\CountAwssCommandHandler;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Aws\Application\Commands
 */
#[Handler(CountAwssCommandHandler::class)]
class CountAwssCommand
{
}
