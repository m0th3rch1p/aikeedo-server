<?php

declare(strict_types=1);

namespace Presentation\Resources;

use Billing\Domain\Entities\PlanEntity;

class PlanResource
{
    public readonly string $id;
    public readonly string $title;
    public readonly ?string $description;
    public readonly ?string $icon;
    public readonly array $feature_list;
    public readonly string $billing_cycle;
    public readonly int $price;
    public readonly ?int $token_credit;
    public readonly ?int $image_credit;
    public readonly ?int $audio_credit;
    public readonly ?int $created_at;
    public readonly ?int $updated_at;
    public readonly bool $is_featured;

    public function __construct(PlanEntity $plan)
    {
        $this->id = $plan->getId()->getValue()->toString();
        $this->title = $plan->getTitle()->value;
        $this->description = $plan->getDescription()->value;
        $this->icon = $plan->getIcon()->value;

        $this->billing_cycle = $plan->getBillingCycle()->value;
        $this->price = $plan->getPrice()->value;
        $this->token_credit = $plan->getTokenCredit()->value;
        $this->image_credit = $plan->getImageCredit()->value;
        $this->audio_credit = $plan->getAudioCredit()->value;
        $this->created_at = $plan->getCreatedAt()->getTimestamp();
        $this->updated_at = $plan->getUpdatedAt()
            ? $plan->getUpdatedAt()->getTimestamp()
            : null;
        $this->is_featured = $plan->getIsFeatured()->value;

        $list = $plan->getFeatureList()->value;
        array_walk(
            $list,
            fn (&$item) => $item = $item[0] == '-'
                ? [
                    'title' => trim(substr($item, 1)),
                    'is_included' => false
                ]
                : [
                    'title' => $item,
                    'is_included' => true
                ]
        );

        $this->feature_list = $list;
    }
}
