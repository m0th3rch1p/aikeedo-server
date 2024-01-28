<?php

declare(strict_types=1);

namespace Billing\Infrastructure;

use Application;
use Billing\Domain\Payments\PaymentGatewayFactoryInterface;
use Billing\Domain\Repositories\PlanRepositoryInterface;
use Billing\Domain\Repositories\SubscriptionRepositoryInterface;
use Billing\Infrastructure\Payments\Gateways\PayPal\PayPal;
use Billing\Infrastructure\Payments\Gateways\Stripe\Stripe;
use Billing\Infrastructure\Payments\PaymentGatewayFactory;
use Billing\Infrastructure\Repositories\DoctrineOrm\PlanRepository;
use Billing\Infrastructure\Repositories\DoctrineOrm\SubscriptionRepository;
use Easy\Container\Attributes\Inject;
use Shared\Infrastructure\BootstrapperInterface;
use Stripe\StripeClient;

/** @package Billing\Infrastructure */
class BillingModuleBootstrapper implements BootstrapperInterface
{
    public function __construct(
        private Application $app,
        private PaymentGatewayFactory $factory,

        #[Inject('option.stripe.secret_key')]
        private ?string $stripeSectetKey = null
    ) {
    }

    /**
     * @inheritDoc
     */
    public function bootstrap(): void
    {
        // Register repository implementations
        $this->app
            ->set(
                PlanRepositoryInterface::class,
                PlanRepository::class
            )
            ->set(
                SubscriptionRepositoryInterface::class,
                SubscriptionRepository::class
            );

        // Register payment gateway implementations
        $this->app->set(
            PaymentGatewayFactoryInterface::class,
            $this->factory
        );

        $this->registerStripeGateway();
    }

    /** @return void  */
    private function registerStripeGateway(): void
    {
        $this->factory
            ->register(Stripe::class)
            ->register(PayPal::class);

        if ($this->stripeSectetKey) {
            $client = new StripeClient($this->stripeSectetKey);
            $this->app->set(StripeClient::class, $client);
        }
    }
}
