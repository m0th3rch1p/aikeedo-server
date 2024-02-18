<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\CancelSubscriptionCommandHandler;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

/** @package Billing\Application\Commands */
#[Handler(CancelSubscriptionCommandHandler::class)]
class CancelSubscriptionCommand
{
    public UserEntity $user;

    /**
     * @param UserEntity $user 
     * @return void 
     */
    public function __construct(
        UserEntity $user,
    ) {
        $this->user = $user;
    }
}
