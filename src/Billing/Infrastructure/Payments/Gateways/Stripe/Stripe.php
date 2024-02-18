<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Payments\Gateways\Stripe;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Payments\PaymentException;
use Billing\Domain\Payments\PaymentGatewayInterface;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\ExternalId;
use Easy\Container\Attributes\Inject;
use JsonSerializable;
use Stripe\Customer;
use Stripe\ErrorObject;
use Stripe\Exception\ApiErrorException;
use Stripe\Price;
use Stripe\Product;
use Stripe\StripeClient;

/** @package Billing\Infrastructure\Payments\Gateways */
class Stripe implements PaymentGatewayInterface
{
    /**
     * @param StripeClient $client 
     * @return void 
     */
    public function __construct(
        private StripeClient $client,

        #[Inject('option.stripe.is_enabled')]
        private bool $isEnabled = false,
    ) {
    }

    public function isEnabled(): bool
    {
        return $this->isEnabled;
    }

    public function getName(): string
    {
        return 'Stripe';
    }

    public function getLogoImgSrc(): string
    {
        $data = file_get_contents(__DIR__ . '/logo.svg');
        return 'data:image/svg+xml;base64,' . base64_encode($data);
    }

    /** @inheritDoc */
    public function createSubscription(
        SubscriptionEntity $subscription,
        array $params = []
    ): JsonSerializable {
        try {
            return $this->doCreateSubscription($subscription, $params);
        } catch (ApiErrorException $th) {
            throw new PaymentException($th->getMessage(), $th->getCode(), $th);
        }
    }

    private function doCreateSubscription(
        SubscriptionEntity $subscription,
        array $params = []
    ): JsonSerializable {
        $customer = $this->findOrCreateCustomer($subscription);
        $price = $this->findOrCreatePrice($subscription);

        // Set external ID's
        $subscription
            ->setExternalCustomerId(new ExternalId($customer->id))
            ->setExternalProductId(new ExternalId($price->product->id))
            ->setExternalPriceId(new ExternalId($price->id));

        $opts = [
            'customer' => $customer->id,
            'metadata' => [
                'subscription_id' => (string) $subscription->getId()->getValue(),
            ],
        ];

        if ($subscription->getPlan()->getBillingCycle() == BillingCycle::ONE_TIME) {
            $opts = [
                ...$opts,
                'amount' =>  $price->unit_amount,
                'currency' => $price->currency,
                'description' => $price->product->description,
            ];

            $charge = $this->client->paymentIntents->create($opts);

            $subscription
                ->setExternalId(new ExternalId($charge->id));

            return $charge;
        }

        $opts = [
            ...$opts,
            'items' => [
                [
                    'price' => $price->id,
                ],
            ],
            'payment_behavior' => 'default_incomplete',
            'expand' => ['latest_invoice.payment_intent', 'pending_setup_intent']
        ];

        $trial_period_days = $subscription->getTrialPeriodDays()->value;
        if ($trial_period_days && $trial_period_days > 0) {
            $opts['trial_period_days'] = $trial_period_days;
        }

        $sub = $this->client->subscriptions->create($opts);
        $subscription
            ->setExternalId(new ExternalId($sub->id));

        return $sub;
    }

    /** @inheritDoc */
    public function cancelSubscription(SubscriptionEntity $subscription): void
    {
        // Check if the subscription belongs to this gateway
        if ($subscription->getPaymentGateway()->value != $this->getLookupKey()) {
            // This subscription doesn't belong to this gateway
            return;
        }

        // Check if the subscription has an external ID
        if (!$subscription->getExternalId()->value) {
            // This subscription doesn't have an external ID
            return;
        }

        // Retrieve the subscription
        $subs = $this->client->subscriptions
            ->retrieve($subscription->getExternalId()->value);

        // Check if the subscription can be canceled
        if ($subs->status == 'canceled') {
            // This subscription is already canceled
            return;
        }

        $subs->cancel();
    }

    /** @inheritDoc */
    public function getLookupKey(): string
    {
        return 'stripe';
    }

    /**
     * @param SubscriptionEntity $subscription 
     * @return Customer 
     * @throws ApiErrorException 
     */
    private function findOrCreateCustomer(
        SubscriptionEntity $subscription
    ): Customer {
        $user = $subscription->getUser();
        $id = $subscription->getExternalCustomerId();
        $customer = null;

        if ($id->value) {
            try {
                $customer = $this->client->customers->retrieve($id->value);
            } catch (ApiErrorException $th) {
                if ($th->getStripeCode() != ErrorObject::CODE_RESOURCE_MISSING) {
                    throw $th;
                }

                $customer = null;
            }
        }

        if (!$customer || $customer->isDeleted()) {
            $customer = $this->client->customers->create([
                'email' => $user->getEmail()->value,
                'name' => $user->getFirstName()->value . ' ' . $user->getLastName()->value,
                'metadata' => [
                    'user_id' => (string) $user->getId()->getValue(),
                ],
            ]);
        }

        return $customer;
    }

    /**
     * @param SubscriptionEntity $subscription 
     * @return Product 
     * @throws ApiErrorException 
     */
    private function findOrCreateProduct(
        SubscriptionEntity $subscription
    ): Product {
        $plan = $subscription->getPlan();
        $id = $subscription->getExternalProductId();
        $product = null;

        if ($id->value) {
            try {
                $product = $this->client->products->retrieve($id->value);
            } catch (ApiErrorException $th) {
                if ($th->getHttpStatus() != 404) {
                    throw $th;
                }

                $product = null;
            }
        }

        if (!$product || $product->isDeleted()) {
            $params = [
                'name' => $plan->getTitle()->value,
                'shippable' => false,
                'metadata' => [
                    'plan_id' => (string) $plan->getId()->getValue(),
                ],
            ];

            if ($plan->getDescription()->value) {
                $params['description'] = $plan->getDescription()->value;
            }

            $product = $this->client->products->create($params);
        }

        return $product;
    }

    /**
     * @param SubscriptionEntity $subscription 
     * @return Price 
     * @throws ApiErrorException 
     */
    private function findOrCreatePrice(
        SubscriptionEntity $subscription
    ): Price {
        $product = $this->findOrCreateProduct($subscription);
        $plan = $subscription->getPlan();
        $id = $subscription->getExternalPriceId();
        $price = null;

        if ($id->value) {
            try {
                $price = $this->client->prices->retrieve($id->value, ['expand' => ['product']]);
            } catch (ApiErrorException $th) {
                if ($th->getHttpStatus() != 404) {
                    throw $th;
                }

                $price = null;
            }
        }

        if (!$price || $price->isDeleted()) {
            $params = [
                'expand' => ['product'],
                'currency' => $subscription->getCurrency()->value,
                'product' => $product->id,
                'unit_amount' => $plan->getPrice()->value,
                'metadata' => [
                    'plan_id' => (string) $plan->getId()->getValue(),
                ],
            ];

            if ($plan->getBillingCycle() != BillingCycle::ONE_TIME) {
                $count = $plan->getBillingCycle() == BillingCycle::YEARLY ? 365 : 30;
                $params['recurring'] = [
                    'interval' => 'day',
                    'interval_count' => $count,
                ];
            }

            $price = $this->client->prices->create($params);
        }

        return $price;
    }
}
