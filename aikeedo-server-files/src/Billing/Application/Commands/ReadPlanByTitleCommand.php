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
     * @param Title $title
     */
    public function __construct(Title $title)
    {
        $this->title = $title;
    }
}