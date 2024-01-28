<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Payments\Gateways\PayPal;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Payments\PaymentGatewayInterface;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\ExternalId;
use Easy\Container\Attributes\Inject;
use JsonSerializable;
use Symfony\Component\Intl\Currencies;

/** @package Billing\Infrastructure\Payments\Gateways\PayPal */
class PayPal implements PaymentGatewayInterface
{
    public function __construct(
        private PayPalClient $client,

        #[Inject('option.paypal.is_enabled')]
        private bool $isEnabled = false
    ) {
    }

    public function isEnabled(): bool
    {
        return $this->isEnabled;
    }

    public function getName(): string
    {
        return 'PayPal';
    }

    public function getLogoImgSrc(): string
    {
        $data = file_get_contents(__DIR__ . '/logo.svg');
        return 'data:image/svg+xml;base64,' . base64_encode($data);
    }

    public function createSubscription(
        SubscriptionEntity $subscription,
        array $params = []
    ): JsonSerializable {
        $plan = $this->findOrCreatePlan($subscription);

        // Set external ID's
        $subscription
            ->setExternalProductId(new ExternalId($plan->product_id))
            ->setExternalPriceId(new ExternalId($plan->id));

        // return new Subscription($sub);
        return new Plan($plan->id);
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

        $this->client->sendRequest(
            'POST',
            "/v1/billing/subscriptions/" . $subscription->getExternalId()->value . "/cancel",
            [
                'reason' => 'Other'
            ]
        );
    }

    public function getLookupKey(): string
    {
        return 'paypal';
    }

    private function findOrCreatePlan(
        SubscriptionEntity $subscription
    ): object {
        $product = $this->findOrCreateProduct($subscription);
        $plan = $subscription->getPlan();
        $id = $subscription->getExternalPriceId();
        $price = null;

        if ($id->value) {
            $resp = $this->client->sendRequest('GET', "/v1/billing/plans/$id->value");
            $price = json_decode($resp->getBody()->getContents());
        }

        if (!$price) {
            $sequence = 1;
            $billing_cycles = [];
            $trial_days = $subscription->getTrialPeriodDays()->value;

            if ($trial_days && $trial_days > 0) {
                $billing_cycles[] = [
                    'tenure_type' => 'TRIAL',
                    'sequence' => $sequence,

                    'total_cycles' => 1,

                    'pricing_scheme' => [
                        'fixed_price' => [
                            'value' => 0,
                            'currency_code' => $subscription->getCurrency()->value,
                        ],
                    ],

                    'frequency' => [
                        'interval_unit' => 'DAY',

                        'interval_count' => $trial_days,
                    ],
                ];

                $sequence++;
            }

            $billing_cycles[] = [
                'tenure_type' => 'REGULAR',
                'sequence' => $sequence,

                'total_cycles' =>
                $plan->getBillingCycle() == BillingCycle::ONE_TIME ? 1 : 0,

                'pricing_scheme' => [
                    'fixed_price' => [
                        'value' => (int) $plan->getPrice()->value / 10 ** Currencies::getFractionDigits(
                            $subscription->getCurrency()->value
                        ),
                        'currency_code' => $subscription->getCurrency()->value,
                    ],
                ],

                'frequency' => [
                    'interval_unit' => 'DAY',

                    'interval_count' =>
                    $plan->getBillingCycle() == BillingCycle::YEARLY ? 365 : 30,
                ],
            ];

            $body = [
                'product_id' => $product->id,
                'name' => $plan->getTitle()->value,
                'status' => 'ACTIVE',
                'billing_cycles' => $billing_cycles,
                'payment_preferences' => [
                    'auto_bill_outstanding' => true,
                ]
            ];

            $resp = $this->client->sendRequest('POST', '/v1/billing/plans', $body);
            $price = json_decode($resp->getBody()->getContents());
        }

        return $price;
    }

    private function findOrCreateProduct(
        SubscriptionEntity $subscription
    ): object {
        $plan = $subscription->getPlan();
        $id = $subscription->getExternalProductId();
        $product = null;

        if ($id->value) {
            $resp = $this->client->sendRequest('GET', "/v1/catalogs/products/$id->value");
            $product = json_decode($resp->getBody()->getContents());
        }

        if (!$product) {
            $body = [
                'name' => $plan->getTitle()->value,
                'type' => 'SERVICE',
                'category' => 'SOFTWARE'
            ];

            if ($plan->getDescription()->value) {
                $body['description'] = $plan->getDescription()->value;
            }

            $resp = $this->client->sendRequest('POST', '/v1/catalogs/products', $body);
            $product = json_decode($resp->getBody()->getContents());
        }

        return  $product;
    }
}
