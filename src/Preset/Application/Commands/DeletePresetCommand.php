<?php

declare(strict_types=1);

namespace Preset\Application\Commands;

use Preset\Application\CommandHandlers\DeletePresetCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Preset\Application\Commands */
#[Handler(DeletePresetCommandHandler::class)]
class DeletePresetCommand
{
    public Id $id;

    /**
     * @param string $id 
     * @return void 
     */
    public function __construct(
        string $id
    ) {
        $this->id = new Id($id);
    }
}
