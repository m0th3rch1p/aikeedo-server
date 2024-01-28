<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\ActivateSubscriptionCommandHandler;
use Billing\Domain\ValueObjects\ExternalId;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

/** @package Billing\Application\Commands */
#[Handler(ActivateSubscriptionCommandHandler::class)]
class ActivateSubscriptionCommand
{
    public Id|UserEntity $user;
    public Id $subscription;
    public ?ExternalId $externalId = null;

    /**
     * @param string|Id|UserEntity $user 
     * @param string|Id $subscription 
     * @return void 
     */
    public function __construct(
        string|Id|UserEntity $user,
        string|Id $subscription
    ) {
        $this->user = is_string($user) ? new Id($user) : $user;
        $this->subscription = is_string($subscription)
            ? new Id($subscription)
            : $subscription;
    }

    /**
     * @param ExternalId $externalId 
     * @return void 
     */
    public function setExternalId(null|string|ExternalId $externalId): void
    {
        $this->externalId = $externalId instanceof ExternalId
            ? $externalId
            : new ExternalId($externalId);
    }
}
