<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\CreateSubscriptionCommandHandler;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\ValueObjects\PaymentGateway;
use Billing\Domain\ValueObjects\TrialPeriodDays;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

/** @package Billing\Application\Commands */
#[Handler(CreateSubscriptionCommandHandler::class)]
class CreateSubscriptionCommand
{
    public Id|UserEntity $user;
    public Id|PlanEntity $plan;
    public PaymentGateway $gateway;
    public TrialPeriodDays $trialPeriodDays;

    /** @var array<string,mixed> */
    public array $params = [];

    public function __construct(
        string|Id|UserEntity $user,
        string|Id|PlanEntity $plan,
        string|PaymentGateway $gateway,
        ?int $days = null
    ) {
        $this->user = is_string($user) ? new Id($user) : $user;
        $this->plan = is_string($plan) ? new Id($plan) : $plan;
        $this->gateway = is_string($gateway)
            ? new PaymentGateway($gateway)
            : $gateway;

        $this->trialPeriodDays = new TrialPeriodDays($days);
    }
}
