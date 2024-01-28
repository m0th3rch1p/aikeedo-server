<?php

declare(strict_types=1);

namespace Preset\Application\Commands;

use Preset\Application\CommandHandlers\ReadPresetCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Preset\Application\Commands */
#[Handler(ReadPresetCommandHandler::class)]
class ReadPresetCommand
{
    public Id $id;

    public function __construct(
        string|Id $id
    ) {
        $this->id = is_string($id) ? new Id($id) : $id;
    }
}
