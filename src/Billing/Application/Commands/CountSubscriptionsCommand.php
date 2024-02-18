<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\CountSubscriptionsCommandHandler;
use Billing\Domain\ValueObjects\Status;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Billing\Application\Commands */
#[Handler(CountSubscriptionsCommandHandler::class)]
class CountSubscriptionsCommand
{
    public ?Status $status = null;

    /** Search terms/query */
    public ?string $query = null;

    /**
     * @param int $status 
     * @return CountSubscriptionsCommand 
     */
    public function setStatus(int $status): self
    {
        $this->status = Status::from($status);
        return $this;
    }
}
