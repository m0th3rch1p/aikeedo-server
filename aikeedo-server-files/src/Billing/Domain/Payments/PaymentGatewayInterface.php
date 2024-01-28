<?php

declare(strict_types=1);

namespace Billing\Domain\Payments;

use Billing\Domain\Entities\SubscriptionEntity;
use JsonSerializable;

/** @package Billing\Domain\Payments */
interface PaymentGatewayInterface
{
    /**
     * Returns the key used to identify the gateway.
     * @return string 
     */
    public function getLookupKey(): string;

    /** @return bool  */
    public function isEnabled(): bool;

    /** @return string  */
    public function getName(): string;

    /** @return string  */
    public function getLogoImgSrc(): string;

    /**
     * @param SubscriptionEntity $subscription 
     * @param array<string,mixed> $params 
     * @return JsonSerializable 
     * @throws PaymentException
     */
    public function createSubscription(
        SubscriptionEntity $subscription,
        array $params = []
    ): JsonSerializable;

    /**
     * @param SubscriptionEntity $subscription 
     * @return void 
     */
    public function cancelSubscription(SubscriptionEntity $subscription): void;
}
