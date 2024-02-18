<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\ReadPlanCommandHandler;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Plan\Application\Commands
 */
#[Handler(ReadPlanCommandHandler::class)]
class ReadPlanCommand
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
