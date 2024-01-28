<?php

declare(strict_types=1);

namespace Billing\Domain\Entities;

use Billing\Domain\Exceptions\PlanIsLockedException;
use DateTime;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\Count;
use Billing\Domain\ValueObjects\Description;
use Billing\Domain\ValueObjects\FeatureList;
use Billing\Domain\ValueObjects\Icon;
use Billing\Domain\ValueObjects\IsFeatured;
use Billing\Domain\ValueObjects\Price;
use Billing\Domain\ValueObjects\Status;
use Billing\Domain\ValueObjects\Superiority;
use Billing\Domain\ValueObjects\Title;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\Selectable;
use Shared\Domain\ValueObjects\Id;
use Traversable;

/**
 * @package Plan\Domain\Entities
 */
#[ORM\Entity]
#[ORM\Table(name: 'plan')]
class PlanEntity
{
    /**
     * A unique numeric identifier of the entity. Don't set this property
     * programmatically. It is automatically set by Doctrine ORM.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Embedded(class: Title::class, columnPrefix: false)]
    private Title $title;

    #[ORM\Embedded(class: Description::class, columnPrefix: false)]
    private Description $description;

    #[ORM\Embedded(class: Icon::class, columnPrefix: false)]
    private Icon $icon;

    #[ORM\Embedded(class: FeatureList::class, columnPrefix: false)]
    private FeatureList $featureList;

    #[ORM\Embedded(class: Price::class, columnPrefix: false)]
    private Price $price;

    #[ORM\Column(type: Types::STRING, name: 'billing_cycle', enumType: BillingCycle::class, nullable: true)]
    private BillingCycle $billingCycle;

    #[ORM\Embedded(class: Count::class, columnPrefix: 'token_credit_')]
    private Count $tokenCredit;

    #[ORM\Embedded(class: Count::class, columnPrefix: 'image_credit_')]
    private Count $imageCredit;

    #[ORM\Embedded(class: Count::class, columnPrefix: 'audio_credit_')]
    private Count $audioCredit;

    /** Creation date and time of the entity */
    #[ORM\Column(type: 'datetime', name: 'created_at')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: 'datetime', name: 'updated_at', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    #[ORM\Column(type: Types::SMALLINT, enumType: Status::class, name: 'status')]
    private Status $status;

    #[ORM\Embedded(class: Superiority::class, columnPrefix: false)]
    private Superiority $superiority;

    #[ORM\Embedded(class: IsFeatured::class, columnPrefix: false)]
    private IsFeatured $isFeatured;

    #[ORM\OneToMany(targetEntity: SubscriptionEntity::class, mappedBy: 'plan')]
    private Collection&Selectable $subscriptions;

    /**
     * @param Title $title 
     * @param Price $price 
     * @param BillingCycle $billingCycle 
     * @return void 
     */
    public function __construct(
        Title $title,
        Price $price,
        BillingCycle $billingCycle
    ) {
        $this->id = new Id();
        $this->title = $title;
        $this->description = new Description();
        $this->icon = new Icon();
        $this->featureList = new FeatureList();
        $this->price = $price;
        $this->billingCycle = $billingCycle;
        $this->tokenCredit = new Count();
        $this->imageCredit = new Count();
        $this->audioCredit = new Count();
        $this->createdAt = new DateTime();
        $this->status = Status::ACTIVE;
        $this->superiority = new Superiority();
        $this->isFeatured = new IsFeatured();

        $this->subscriptions = new ArrayCollection();
    }

    /**
     * @return Id
     */
    public function getId(): Id
    {
        return $this->id;
    }

    /** @return Title  */
    public function getTitle(): Title
    {
        return $this->title;
    }

    /**
     * @param Title $title 
     * @return void 
     */
    public function setTitle(Title $title): void
    {
        $this->title = $title;
    }

    /** @return Description  */
    public function getDescription(): Description
    {
        return $this->description;
    }

    /**
     * @param Description $description 
     * @return void 
     */
    public function setDescription(Description $description): void
    {
        $this->description = $description;
    }

    /** @return Icon  */
    public function getIcon(): Icon
    {
        return $this->icon;
    }

    /**
     * @param Icon $icon 
     * @return void 
     */
    public function setIcon(Icon $icon): void
    {
        $this->icon = $icon;
    }

    /** @return FeatureList  */
    public function getFeatureList(): FeatureList
    {
        return $this->featureList;
    }

    /**
     * @param FeatureList $featureList 
     * @return void 
     */
    public function setFeatureList(FeatureList $featureList): void
    {
        $this->featureList = $featureList;
    }

    /** @return Price  */
    public function getPrice(): Price
    {
        return $this->price;
    }

    /**
     * @param Price $price 
     * @return void 
     * @throws PlanIsLockedException 
     */
    public function setPrice(Price $price): void
    {
        if ($this->isLocked()) {
            throw new PlanIsLockedException($this);
        }

        $this->price = $price;
    }

    /** @return BillingCycle  */
    public function getBillingCycle(): BillingCycle
    {
        return $this->billingCycle;
    }

    /**
     * @param BillingCycle $billingCycle 
     * @return void 
     * @throws PlanIsLockedException 
     */
    public function setBillingCycle(BillingCycle $billingCycle): void
    {
        if ($this->isLocked()) {
            throw new PlanIsLockedException($this);
        }

        $this->billingCycle = $billingCycle;
    }

    /** @return Count  */
    public function getTokenCredit(): Count
    {
        return $this->tokenCredit;
    }

    /**
     * @param Count $tokenCredit 
     * @return void 
     * @throws PlanIsLockedException 
     */
    public function setTokenCredit(Count $tokenCredit): void
    {
        if ($this->isLocked()) {
            throw new PlanIsLockedException($this);
        }

        $this->tokenCredit = $tokenCredit;
    }

    /** @return Count  */
    public function getImageCredit(): Count
    {
        return $this->imageCredit;
    }

    /**
     * @param Count $imageCredit 
     * @return void 
     * @throws PlanIsLockedException 
     */
    public function setImageCredit(Count $imageCredit): void
    {
        if ($this->isLocked()) {
            throw new PlanIsLockedException($this);
        }

        $this->imageCredit = $imageCredit;
    }

    /** @return Count  */
    public function getAudioCredit(): Count
    {
        return $this->audioCredit;
    }

    /**
     * @param Count $audioCredit 
     * @return void 
     * @throws PlanIsLockedException 
     */
    public function setAudioCredit(Count $audioCredit): void
    {
        if ($this->isLocked()) {
            throw new PlanIsLockedException($this);
        }

        $this->audioCredit = $audioCredit;
    }

    /**
     * @return DateTimeInterface
     */
    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    /**
     * @return null|DateTimeInterface
     */
    public function getUpdatedAt(): ?DateTimeInterface
    {
        return $this->updatedAt;
    }

    /** @return Status  */
    public function getStatus(): Status
    {
        return $this->status;
    }

    /**
     * @param Status $status 
     * @return void 
     */
    public function setStatus(Status $status): void
    {
        $this->status = $status;
    }

    /** @return Superiority  */
    public function getSuperiority(): Superiority
    {
        return $this->superiority;
    }

    /**
     * @param Superiority $superiority 
     * @return void 
     */
    public function setSuperiority(Superiority $superiority): void
    {
        $this->superiority = $superiority;
    }

    /** @return IsFeatured  */
    public function getIsFeatured(): IsFeatured
    {
        return $this->isFeatured;
    }

    /**
     * @param IsFeatured $isFeatured 
     * @return void 
     */
    public function setIsFeatured(IsFeatured $isFeatured): void
    {
        $this->isFeatured = $isFeatured;
    }

    /**
     * @return void
     */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    /** @return bool  */
    public function isActive(): bool
    {
        return $this->getStatus() == Status::ACTIVE;
    }

    /**
     * @return Traversable<SubscriptionEntity>
     * @throws Exception 
     */
    public function getSubscriptions(): Traversable
    {
        return $this->subscriptions->getIterator();
    }

    /** @return bool  */
    public function isLocked(): bool
    {
        return $this->subscriptions->count() > 0;
    }
}
