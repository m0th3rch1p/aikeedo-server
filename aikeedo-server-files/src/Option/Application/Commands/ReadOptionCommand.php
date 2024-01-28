<?php

declare(strict_types=1);

namespace Option\Application\Commands;

use Option\Application\CommandHandlers\ReadOptionCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Option\Application\Commands
 */
#[Handler(ReadOptionCommandHandler::class)]
class ReadOptionCommand
{
    public Id $id;

    /**
     * @param string $id
     * @return void
     */
    public function __construct(string $id)
    {
        $this->id = new Id($id);
    }
}
