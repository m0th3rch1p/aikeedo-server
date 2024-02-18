<?php

declare(strict_types=1);

namespace Billing\Domain\Entities;

use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\Count;
use Billing\Domain\ValueObjects\ExternalId;
use Billing\Domain\ValueObjects\PaymentGateway;
use Billing\Domain\ValueObjects\Status;
use Billing\Domain\ValueObjects\TrialPeriodDays;
use Billing\Domain\ValueObjects\Usage;
use Billing\Domain\ValueObjects\UsageType;
use DateTime;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Exception;
use LogicException;
use Shared\Domain\ValueObjects\CurrencyCode;
use Shared\Domain\ValueObjects\Id;
use User\Domain\Entities\UserEntity;

#[ORM\Entity]
#[ORM\Table(name: 'subscription')]
#[ORM\UniqueConstraint(columns: ['payment_gateway', 'external_id'])]
class SubscriptionEntity
{
    /**
     * A unique numeric identifier of the entity. Don't set this property
     * programmatically. It is automatically set by Doctrine ORM.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\ManyToOne(targetEntity: UserEntity::class, inversedBy: 'subscriptions')]
    #[ORM\JoinColumn(nullable: false)]
    private UserEntity $user;

    #[ORM\ManyToOne(targetEntity: PlanEntity::class, inversedBy: 'subscriptions')]
    #[ORM\JoinColumn(nullable: false)]
    private PlanEntity $plan;

    #[ORM\Column(type: Types::STRING, length: 3, enumType: CurrencyCode::class)]
    private CurrencyCode $currency;

    #[ORM\Column(type: Types::INTEGER, length: 30, enumType: Status::class)]
    private Status $status;

    #[ORM\Embedded(class: TrialPeriodDays::class, columnPrefix: false)]
    private TrialPeriodDays $trialPeriodDays;

    #[ORM\Embedded(class: PaymentGateway::class, columnPrefix: false)]
    private PaymentGateway $paymentGateway;

    #[ORM\Embedded(class: Count::class, columnPrefix: 'token_usage_')]
    private Count $tokenUsage;

    #[ORM\Embedded(class: Count::class, columnPrefix: 'image_usage_')]
    private Count $imageUsage;

    #[ORM\Embedded(class: Count::class, columnPrefix: 'audio_usage_')]
    private Count $audioUsage;

    #[ORM\Embedded(class: ExternalId::class, columnPrefix: false)]
    private ExternalId $externalId;

    #[ORM\Embedded(class: ExternalId::class, columnPrefix: 'customer_')]
    private ExternalId $externalCustomerId;

    #[ORM\Embedded(class: ExternalId::class, columnPrefix: 'price_')]
    private ExternalId $externalPriceId;

    #[ORM\Embedded(class: ExternalId::class, columnPrefix: 'product_')]
    private ExternalId $externalProductId;

    /** Creation date and time of the entity */
    #[ORM\Column(type: 'datetime', name: 'created_at')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: 'datetime', name: 'updated_at', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    /** Expire the subscription at this date/time */
    #[ORM\Column(type: 'datetime', name: 'expire_at', nullable: true)]
    private ?DateTimeInterface $expireAt = null;

    /** 
     * The date and time to reset the credit usage next time. 
     * For one time payments, this value is always null.
     * 
     * For recurring payments, this value is set to the next current 
     * reset_at plus 30 days. 
     * 
     * First reset date is set at the time of the activation to the 
     * trials_period_days later (if trial_days > 0), otherwise it is set to the 
     * current date plus 30 days .
     */
    #[ORM\Column(type: 'datetime', name: 'reset_credits_at', nullable: true)]
    private ?DateTimeInterface $resetUsageAt = null;

    /**
     * @param UserEntity $user 
     * @param PlanEntity $plan 
     * @param PaymentGateway $paymentGateway 
     * @return void 
     * @throws PlanNotFoundException 
     * @throws Exception 
     */
    public function __construct(
        UserEntity $user,
        PlanEntity $plan,
        CurrencyCode $currency,
        PaymentGateway $paymentGateway,
        TrialPeriodDays $trialPeriodDays
    ) {
        if (!$plan->isActive()) {
            // Subscriptions can be created 
            // only with plans in active statuses
            throw new PlanNotFoundException($plan->getId());
        }

        $this->id = new Id();
        $this->user = $user;
        $this->plan = $plan;
        $this->currency = $currency;
        $this->status = Status::INACTIVE;
        $this->trialPeriodDays
            = $plan->getBillingCycle() == BillingCycle::ONE_TIME
            ? new TrialPeriodDays()
            : $trialPeriodDays;
        $this->paymentGateway = $paymentGateway;

        $this->tokenUsage = new Count(0);
        $this->imageUsage = new Count(0);
        $this->audioUsage = new Count(0);

        $this->externalId = new ExternalId();
        $this->externalCustomerId = $this->findExternalCustomerId();
        $this->externalPriceId = $this->findExternalPriceId();
        $this->externalProductId = $this->findExternalProductId();

        $this->createdAt = new DateTime();

        if (
            $this->trialPeriodDays->value > 0
            && is_null($this->paymentGateway->value)
        ) {
            $this->expireAt = new DateTime(
                $this->createdAt->format('Y-m-d H:i:s')
                    . " +{$this->trialPeriodDays->value} days"
            );
        }
    }

    /** @return Id  */
    public function getId(): Id
    {
        return $this->id;
    }

    /** @return UserEntity  */
    public function getUser(): UserEntity
    {
        return $this->user;
    }

    /** @return PlanEntity  */
    public function getPlan(): PlanEntity
    {
        return $this->plan;
    }

    /** @return CurrencyCode */
    public function getCurrency(): CurrencyCode
    {
        return $this->currency;
    }

    /** @return Status  */
    public function getStatus(): Status
    {
        return $this->status;
    }

    /** @return TrialPeriodDays  */
    public function getTrialPeriodDays(): TrialPeriodDays
    {
        return $this->trialPeriodDays;
    }

    /** @return PaymentGateway  */
    public function getPaymentGateway(): PaymentGateway
    {
        return $this->paymentGateway;
    }

    /**
     * Get remaining token credit
     *
     * @return Count
     */
    public function getTokenCredit(): Count
    {
        $plan = $this->plan;

        if ($plan->getTokenCredit()->value === null) {
            // Unlimited token credit
            return new Count(null);
        }

        $credit = $plan->getTokenCredit()->value - $this->tokenUsage->value;
        return new Count($credit > 0 ? $credit : 0);
    }

    /**
     * Get remaining image credit
     *
     * @return Count
     */
    public function getImageCredit(): Count
    {
        $plan = $this->plan;

        if ($plan->getImageCredit()->value === null) {
            // Unlimited image credit
            return new Count(null);
        }

        $credit = $plan->getImageCredit()->value - $this->imageUsage->value;
        return new Count($credit > 0 ? $credit : 0);
    }

    /**
     * Get remaining audio credit
     *
     * @return Count
     */
    public function getAudioCredit(): Count
    {
        $plan = $this->plan;

        if ($plan->getAudioCredit()->value === null) {
            // Unlimited audio credit
            return new Count(null);
        }

        $credit = $plan->getAudioCredit()->value - $this->audioUsage->value;
        return new Count($credit > 0 ? $credit : 0);
    }

    /** @return ExternalId  */
    public function getExternalId(): ExternalId
    {
        return $this->externalId;
    }

    /**
     * @param ExternalId $externalId 
     * @return SubscriptionEntity 
     */
    public function setExternalId(ExternalId $externalId): self
    {
        $this->externalId = $externalId;
        return $this;
    }

    /** @return ExternalId  */
    public function getExternalCustomerId(): ExternalId
    {
        return $this->externalCustomerId;
    }

    /**
     * @param ExternalId $externalCustomerId 
     * @return SubscriptionEntity 
     */
    public function setExternalCustomerId(ExternalId $externalCustomerId): self
    {
        $this->externalCustomerId = $externalCustomerId;
        return $this;
    }

    /** @return ExternalId  */
    public function getExternalPriceId(): ExternalId
    {
        return $this->externalPriceId;
    }

    /**
     * @param ExternalId $externalPriceId 
     * @return SubscriptionEntity 
     */
    public function setExternalPriceId(ExternalId $externalPriceId): self
    {
        $this->externalPriceId = $externalPriceId;
        return $this;
    }

    /** @return ExternalId  */
    public function getExternalProductId(): ExternalId
    {
        return $this->externalProductId;
    }

    /**
     * @param ExternalId $externalProductId 
     * @return SubscriptionEntity 
     */
    public function setExternalProductId(ExternalId $externalProductId): self
    {
        $this->externalProductId = $externalProductId;
        return $this;
    }

    /** @return DateTimeInterface  */
    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    /** @return null|DateTimeInterface  */
    public function getUpdatedAt(): ?DateTimeInterface
    {
        return $this->updatedAt;
    }

    /** @return null|DateTimeInterface  */
    public function getResetUsageAt(): ?DateTimeInterface
    {
        return $this->resetUsageAt;
    }

    public function isExpired(): bool
    {
        if (!$this->expireAt) {
            return false;
        }

        return $this->expireAt < new DateTime();
    }

    /** @return void  */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    /**
     * @return SubscriptionEntity 
     * @throws LogicException 
     */
    public function activate(): self
    {
        if ($this->status->value == Status::ACTIVE) {
            throw new LogicException('Subscription is already active');
        }

        if ($this->getPlan()->getBillingCycle() != BillingCycle::ONE_TIME) {
            $this->resetUsage();
            $this->status = Status::ACTIVE;

            $this->user->setActiveSubscription($this);
            return $this;
        }

        $this->status = Status::ACTIVE;
        return $this;
    }

    public function cancel(): self
    {
        $this->status = Status::INACTIVE;
        return $this;
    }

    /** @return SubscriptionEntity  */
    public function resetUsage(): self
    {
        if (
            $this->getPlan()->getBillingCycle() == BillingCycle::ONE_TIME
            && $this->status == Status::ACTIVE
        ) {
            // One time payments do not reset usages
            return $this;
        }

        if (
            $this->resetUsageAt
            && $this->resetUsageAt > new DateTime()
            && $this->status == Status::ACTIVE
        ) {
            // Credits are not reset yet
            return $this;
        }

        $from = is_null($this->resetUsageAt) ? new DateTime() : $this->resetUsageAt;
        $preiod = $this->trialPeriodDays->value > 0 ? $this->trialPeriodDays->value : 30;

        $this->resetUsageAt = new DateTime(
            $from->format('Y-m-d H:i:s') . " +{$preiod} days"
        );

        $this->tokenUsage = new Count(0);
        $this->imageUsage = new Count(0);
        $this->audioUsage = new Count(0);

        return $this;
    }

    /**
     * @return ExternalId 
     * @throws Exception 
     */
    private function findExternalCustomerId(): ExternalId
    {
        $id = null;

        foreach ($this->user->getSubscriptions() as $subs) {
            if (
                $subs->getPaymentGateway() == $this->paymentGateway
                && $subs->getExternalCustomerId()->value !== null
            ) {
                $id = $subs->getExternalCustomerId();
            }
        }

        if (!$id) {
            $id = new ExternalId();
        }

        return $id;
    }

    /** @return ExternalId  */
    private function findExternalPriceId(): ExternalId
    {
        $id = null;

        foreach ($this->plan->getSubscriptions() as $subs) {
            if (
                $subs->getPaymentGateway() == $this->paymentGateway
                && $subs->getCurrency() == $this->currency
                && $subs->getExternalPriceId()->value !== null
            ) {
                $id = $subs->getExternalPriceId();
            }
        }

        if (!$id) {
            $id = new ExternalId();
        }

        return $id;
    }

    /** @return ExternalId  */
    private function findExternalProductId(): ExternalId
    {
        $id = null;

        foreach ($this->plan->getSubscriptions() as $subs) {
            if (
                $subs->getPaymentGateway() == $this->paymentGateway
                && $subs->getExternalProductId()->value !== null
            ) {
                $id = $subs->getExternalProductId();
            }
        }

        if (!$id) {
            $id = new ExternalId();
        }

        return $id;
    }

    /**
     * @param Usage $usage Unprocessed usage
     * @return Usage 
     */
    public function useCredit(Usage $usage): Usage
    {
        switch ($usage->type) {
            case UsageType::TOKEN:
                $credit = $this->getTokenCredit();
                $usage = $this->processCredit($usage, $credit, $this->tokenUsage);
                break;
            case UsageType::IMAGE:
                $credit = $this->getImageCredit();
                $usage = $this->processCredit($usage, $credit, $this->imageUsage);
                break;
            case UsageType::AUDIO:
                $credit = $this->getAudioCredit();
                $usage = $this->processCredit($usage, $credit, $this->audioUsage);
                break;
        }

        // If all credits are used up, deactivate the credit pack
        if (
            $this->plan->getBillingCycle() == BillingCycle::ONE_TIME
            && $this->getTokenCredit()->value === 0
            && $this->getImageCredit()->value === 0
            && $this->getAudioCredit()->value === 0
        ) {
            $this->status = Status::INACTIVE;
        }

        return $usage;
    }

    /**
     * @param Usage $usage
     * @param Count $credit 
     * @return Usage Unprocessed usage
     */
    private function processCredit(Usage $usage, Count $remainingCredit, Count &$currentUsage): Usage
    {
        if ($remainingCredit->value === 0) {
            return $usage;
        }

        if (
            null === $remainingCredit->value
            || $remainingCredit->value >= $usage->value
        ) {
            $currentUsage = new Count($currentUsage->value + $usage->value);
            return new Usage($usage->type, 0);
        }

        $currentUsage = new Count($currentUsage->value + $remainingCredit->value);
        return new Usage($usage->type, $usage->value - $remainingCredit->value);
    }
}
