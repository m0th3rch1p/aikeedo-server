<?php

declare(strict_types=1);

namespace Presentation\Resources\Api;

use Billing\Domain\Entities\SubscriptionEntity;
use JsonSerializable;
use Presentation\Resources\CurrencyResource;
use Presentation\Resources\DateTimeResource;

class SubscriptionResource implements JsonSerializable
{
    public function __construct(
        private SubscriptionEntity $subscription
    ) {
    }

    public function jsonSerialize(): array
    {
        $s = $this->subscription;

        $output = [
            'id' => $s->getId(),
            'payment_gateway' => $s->getPaymentGateway(),
            'token_credit' => $s->getTokenCredit(),
            'image_credit' => $s->getImageCredit(),
            'audio_credit' => $s->getAudioCredit(),
            'created_at' => new DateTimeResource($s->getCreatedAt()),
            'updated_at' => new DateTimeResource($s->getUpdatedAt()),
            'reset_credits_at' => new DateTimeResource($s->getResetUsageAt()),
            'plan' => new PlanResource($s->getPlan()),
            'currency' => new CurrencyResource($s->getCurrency()),
        ];

        return $output;
    }
}
