<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\ResetUsageCommandHandler;
use Billing\Domain\Entities\SubscriptionEntity;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Billing\Application\Commands */
#[Handler(ResetUsageCommandHandler::class)]
class ResetUsageCommand
{
    public Id|SubscriptionEntity $id;

    /**
     * @param string|Id|SubscriptionEntity $id 
     * @return void 
     */
    public function __construct(string|Id|SubscriptionEntity $id)
    {
        $this->id = is_string($id) ? new Id($id) : $id;
    }
}
