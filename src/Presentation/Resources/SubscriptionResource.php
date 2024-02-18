<?php

declare(strict_types=1);

namespace Presentation\Resources;

use Billing\Domain\Entities\SubscriptionEntity;

class SubscriptionResource
{
    public readonly string $id;
    public readonly PlanResource $plan;
    public readonly CurrencyResource $currency;
    public readonly ?int $trial_period_days;
    public readonly ?string $payment_gateway;
    public readonly ?int $token_credit;
    public readonly ?int $image_credit;
    public readonly ?int $audio_credit;
    public readonly ?int $created_at;
    public readonly ?int $updated_at;
    public readonly ?int $reset_usage_at;

    public function __construct(SubscriptionEntity $sub)
    {
        $this->id = $sub->getId()->getValue()->toString();
        $this->plan = new PlanResource($sub->getPlan());
        $this->currency = new CurrencyResource($sub->getCurrency());
        $this->trial_period_days = $sub->getTrialPeriodDays()->value;
        $this->payment_gateway = $sub->getPaymentGateway()->value;
        $this->token_credit = $sub->getTokenCredit()->value;
        $this->image_credit = $sub->getImageCredit()->value;
        $this->audio_credit = $sub->getAudioCredit()->value;
        $this->created_at = $sub->getCreatedAt()->getTimestamp();
        $this->updated_at = $sub->getUpdatedAt()
            ? $sub->getUpdatedAt()->getTimestamp()
            : null;
        $this->reset_usage_at = $sub->getResetUsageAt()
            ? $sub->getResetUsageAt()->getTimestamp()
            : null;
    }
}
