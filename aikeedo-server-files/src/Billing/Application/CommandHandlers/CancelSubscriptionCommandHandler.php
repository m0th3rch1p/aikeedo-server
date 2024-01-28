<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\CancelSubscriptionCommand;
use Billing\Application\Commands\ReadPlanCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\Payments\GatewayNotFoundException;
use Billing\Domain\Payments\PaymentGatewayFactoryInterface;
use Billing\Domain\Services\ActivateSubscriptionService;
use Billing\Domain\ValueObjects\PaymentGateway;
use Billing\Domain\ValueObjects\TrialPeriodDays;
use Easy\Container\Attributes\Inject;
use Exception;
use Shared\Domain\ValueObjects\CurrencyCode;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Repositories\UserRepositoryInterface;

/** @package Billing\Application\CommandHandlers */
class CancelSubscriptionCommandHandler
{
    /**
     * @param PaymentGatewayFactoryInterface $factory 
     * @param Dispatcher $dispatcher 
     * @param null|string $defaultPlanId 
     * @return void 
     */
    public function __construct(
        private PaymentGatewayFactoryInterface $factory,
        private UserRepositoryInterface $repo,
        private Dispatcher $dispatcher,
        private ActivateSubscriptionService $service,

        #[Inject('option.billing.currency')]
        private ?string $currency = null,

        #[Inject('option.billing.fallback_plan')]
        private ?string $defaultPlanId = null,
    ) {
    }

    /**
     * @param CancelSubscriptionCommand $cmd
     * @return null|SubscriptionEntity
     * @throws NoHandlerFoundException
     * @throws Exception
     */
    public function handle(CancelSubscriptionCommand $cmd): ?SubscriptionEntity
    {
        $user = $cmd->user;
        $subscription = $user->getActiveSubscription();

        if ($subscription) {
            $user->removeActiveSubscription();
            $this->repo->flush();

            if ($subscription->getPaymentGateway()->value) {
                try {
                    $gateway = $this->factory->create(
                        $subscription->getPaymentGateway()->value
                    );

                    $gateway->cancelSubscription($subscription);
                } catch (GatewayNotFoundException $th) {
                    // Do nothing. Gateway is not available anymore.
                    // Merchant should cancel subscription manually on 3rd the 
                    // party gateway.
                }
            }
        }

        $plan = null;
        if ($this->defaultPlanId) {
            try {
                $plan = $this->dispatcher->dispatch(
                    new ReadPlanCommand($this->defaultPlanId)
                );
            } catch (PlanNotFoundException $th) {
            }
        }

        if ($plan) {
            $currency = CurrencyCode::tryFrom($this->currency ?? 'USD')
                ?? CurrencyCode::USD;

            $sub = $user->subscribeToPlan(
                $plan,
                $currency,
                new PaymentGateway(),
                new TrialPeriodDays()
            );
            $this->service->activateSubscription($sub);
        }

        return null;
    }
}
