<?php

declare(strict_types=1);

namespace Category\Application\Commands;

use Category\Application\CommandHandlers\CountCategoriesCommandHandler;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Category\Application\Commands */
#[Handler(CountCategoriesCommandHandler::class)]
class CountCategoriesCommand
{
}
