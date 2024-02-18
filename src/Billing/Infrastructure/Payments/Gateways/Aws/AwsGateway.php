<?php

namespace Billing\Infrastructure\Payments\Gateways\Aws;

use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Payments\PaymentGatewayInterface;
use Billing\Infrastructure\Payments\Gateways\PayPal\Subscription;
use JsonSerializable;

class AwsGateway implements PaymentGatewayInterface
{


    public function __construct(private bool $isEnabled = true)
    {

    }

    public function getLookupKey(): string
    {
        // TODO: Implement getLookupKey() method.
        return 'aws';
    }

    public function isEnabled(): bool
    {
        // TODO: Implement isEnabled() method.
        return $this->isEnabled;
    }

    public function getName(): string
    {
        // TODO: Implement getName() method.
        return 'AWS';
    }

    public function getLogoImgSrc(): string
    {
        // TODO: Implement getLogoImgSrc() method.
        $data = file_get_contents(__DIR__ . '/logo.svg');
        return 'data:image/svg+xml;base64,' . base64_encode($data);
    }

    public function createSubscription(SubscriptionEntity $subscription, array $params = []): JsonSerializable
    {
        // TODO: Implement createSubscription() method.
        $obj = ['id' => $subscription->getId(), 'status' => 'true', 'plan_id' => $subscription->getPlan()->getId()];
        return new Subscription((object)json_decode(json_encode($obj)));
    }

    public function cancelSubscription(SubscriptionEntity $subscription): void
    {
        // TODO: Implement cancelSubscription() method.
    }
}