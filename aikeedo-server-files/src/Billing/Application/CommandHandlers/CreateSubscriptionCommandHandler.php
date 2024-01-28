<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\CreateSubscriptionCommand;
use Billing\Application\Responses\SubscriptionResponse;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Payments\GatewayNotFoundException;
use Billing\Domain\Payments\PaymentException;
use Billing\Domain\Payments\PaymentGatewayFactoryInterface;
use Billing\Domain\Services\SubscriptionCreateService;
use Easy\Container\Attributes\Inject;
use Exception;
use Shared\Domain\ValueObjects\CurrencyCode;
use Shared\Domain\ValueObjects\Id;

/** @package Billing\Application\CommandHandlers */
class CreateSubscriptionCommandHandler
{
    public function __construct(
        private PaymentGatewayFactoryInterface $factory,
        private SubscriptionCreateService $service,

        #[Inject('option.billing.currency')]
        private ?string $currency = null,

        #[Inject('option.billing.trial_without_payment')]
        private ?bool $trialWithoutPayment = null
    ) {
    }

    /**
     * @param CreateSubscriptionCommand $cmd
     * @return SubscriptionResponse
     * @throws PlanNotFoundException
     * @throws Exception
     * @throws GatewayNotFoundException
     * @throws PaymentException
     */
    public function handle(CreateSubscriptionCommand $cmd): SubscriptionResponse
    {
        if ($cmd->plan instanceof Id) {
            $cmd->plan = $this->service->findPlanOrFail($cmd->plan);
        }

        $currency = CurrencyCode::tryFrom($this->currency ?? 'USD')
            ?? CurrencyCode::USD;

        $subscription = $cmd->user->subscribeToPlan(
            $cmd->plan,
            $currency,
            $cmd->gateway,
            $cmd->trialPeriodDays
        );

        $params = null;

        if ($cmd->plan->getPrice()->value > 0 && (!$subscription->getTrialPeriodDays()->value || !$this->trialWithoutPayment)) {
            $gateway = $this->factory->create($cmd->gateway->value);
            $params = $gateway->createSubscription($subscription, $cmd->params);
        }

        $this->service->createSubscription($subscription);

        return new SubscriptionResponse($subscription, $params);
    }
}
