<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use Billing\Application\Commands\ActivateSubscriptionCommand;
use Billing\Application\Commands\ReadPlanCommand;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\ValueObjects\PaymentGateway;
use Billing\Domain\ValueObjects\TrialPeriodDays;
use Easy\Container\Attributes\Inject;
use Shared\Domain\ValueObjects\CurrencyCode;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Application\Commands\CreateUserCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\EmailTakenException;
use User\Domain\Services\CreateUserService;

/** @package User\Application\CommandHandlers */
class CreateUserCommandHandler
{
    /**
     * @param CreateUserService $service
     * @return void
     */
    public function __construct(
        private CreateUserService $service,
        private Dispatcher $dispatcher,

        #[Inject('option.billing.signup_plan')]
        private ?string $planId = null,

        #[Inject('option.billing.currency')]
        private ?string $currency = null,

        #[Inject('option.billing.trial_period_days')]
        private ?int $trialPeriodDays = 0
    ) {
    }

    /**
     * @param CreateUserCommand $cmd
     * @return UserEntity
     * @throws EmailTakenException
     */
    public function handle(CreateUserCommand $cmd): UserEntity
    {
        $user = new UserEntity(
            email: $cmd->email,
            firstName: $cmd->firstName,
            lastName: $cmd->lastName
        );

        if ($cmd->password) {
            $user->setPassword($cmd->password);
        }

        if ($cmd->language) {
            $user->setLanguage($cmd->language);
        }

        if ($cmd->role) {
            $user->setRole($cmd->role);
        }

        if ($cmd->status) {
            $user->setStatus($cmd->status);
        }

        $this->service->createUser($user);

        if (!$this->planId) {
            return $user;
        }

        $plan = null;
        try {
            $cmd = new ReadPlanCommand($this->planId);
            $plan = $this->dispatcher->dispatch($cmd);
        } catch (PlanNotFoundException $th) {
            $plan = null;
        }

        if (!$plan) {
            return $user;
        }

        $currency = CurrencyCode::tryFrom($this->currency ?? 'USD')
            ?? CurrencyCode::USD;

        $sub = $user->subscribeToPlan(
            $plan,
            $currency,
            new PaymentGateway(),
            new TrialPeriodDays(
                $this->trialPeriodDays > 0
                    ? $this->trialPeriodDays
                    : null
            )
        );

        $this->dispatcher->dispatch(
            new ActivateSubscriptionCommand($user, $sub->getId())
        );

        return $user;
    }
}
