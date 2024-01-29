<?php

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\ReadPlanByTitleCommandHandler;
use Billing\Domain\ValueObjects\Title;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

#[Handler(ReadPlanByTitleCommandHandler::class)]
class ReadPlanByTitleCommand
{
    public Title $title;

    /**
     * @param string $title
     */
    public function __construct(string $title)
    {
        $this->title = new Title($title);
    }
}