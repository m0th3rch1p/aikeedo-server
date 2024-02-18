<?php

declare(strict_types=1);

namespace Option\Application\Commands;

use Option\Application\CommandHandlers\ListOptionsCommandHandler;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Option\Application\Commands
 */
#[Handler(ListOptionsCommandHandler::class)]
class ListOptionsCommand extends CountOptionsCommand
{
}
