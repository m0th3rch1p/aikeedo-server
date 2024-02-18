<?php

declare(strict_types=1);

namespace Presentation\Resources\Admin\Api;

use JsonSerializable;
use Billing\Domain\Entities\PlanEntity;
use Presentation\Resources\DateTimeResource;

/** @package Presentation\Resources\Admin\Api */
class PlanResource implements JsonSerializable
{
    /**
     * @param PlanEntity $plan 
     * @return void 
     */
    public function __construct(
        private PlanEntity $plan
    ) {
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        $p = $this->plan;

        return [
            'id' => $p->getId(),
            'title' => $p->getTitle(),
            'description' => $p->getDescription(),
            'icon' => $p->getIcon()->value,
            'features' => implode(', ', $p->getFeatureList()->value),
            'price' => $p->getPrice(),
            'billing_cycle' => $p->getBillingCycle(),
            'token_credit' => $p->getTokenCredit(),
            'image_credit' => $p->getImageCredit(),
            'audio_credit' => $p->getAudioCredit(),
            'superiority' => $p->getSuperiority(),
            'status' => $p->getStatus(),
            'is_locked' => $p->isLocked(),
            'is_featured' => $p->getIsFeatured()->value,
            'created_at' => new DateTimeResource($p->getCreatedAt()),
            'updated_at' => new DateTimeResource($p->getUpdatedAt()),
        ];
    }
}
