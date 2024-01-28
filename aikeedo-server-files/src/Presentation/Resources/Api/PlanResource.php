<?php

declare(strict_types=1);

namespace Presentation\Resources\Api;

use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Entities\SubscriptionEntity;
use JsonSerializable;
use Presentation\Resources\DateTimeResource;

class PlanResource implements JsonSerializable
{
    public function __construct(
        private PlanEntity $plan
    ) {
    }

    public function jsonSerialize(): array
    {
        $plan = $this->plan;

        $output = [
            'id' => $plan->getId(),
            'title' => $plan->getTitle(),
            'description' => $plan->getDescription(),
            'price' => $plan->getPrice(),
            'billing_cycle' => $plan->getBillingCycle(),
            'token_credit' => $plan->getTokenCredit(),
            'image_credit' => $plan->getImageCredit(),
            'audio_credit' => $plan->getAudioCredit(),
            'created_at' => new DateTimeResource($plan->getCreatedAt()),
            'updated_at' => new DateTimeResource($plan->getUpdatedAt()),
            'superiority' => $plan->getSuperiority(),
        ];

        return $output;
    }
}
