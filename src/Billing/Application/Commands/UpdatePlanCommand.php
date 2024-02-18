<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\UpdatePlanCommandHandler;
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
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Plan\Application\Commands
 */
#[Handler(UpdatePlanCommandHandler::class)]
class UpdatePlanCommand
{
    public Id $id;

    public ?Title $title = null;
    public ?Price $price = null;
    public ?BillingCycle $billingCycle = null;
    public ?Description $description = null;
    public ?Count $tokenCredit = null;
    public ?Count $imageCredit = null;
    public ?Count $audioCredit = null;
    public ?Superiority $superiority = null;
    public ?Status $status = null;
    public ?IsFeatured $isFeatured = null;
    public ?Icon $icon = null;
    public ?FeatureList $featureList = null;

    /**
     * @param string $id
     * @return void
     */
    public function __construct(string $id)
    {
        $this->id = new Id($id);
    }

    /**
     * @param string $title 
     * @return UpdatePlanCommand 
     */
    public function setTitle(string $title): self
    {
        $this->title = new Title($title);
        return $this;
    }

    /**
     * @param int $price 
     * @return UpdatePlanCommand 
     */
    public function setPrice(int $price): self
    {
        $this->price = new Price($price);
        return $this;
    }

    /**
     * @param string $billingCycle 
     * @return UpdatePlanCommand 
     */
    public function setBillingCycle(string $billingCycle): self
    {
        $this->billingCycle = BillingCycle::from($billingCycle);
        return $this;
    }

    /**
     * @param null|string $description 
     * @return UpdatePlanCommand 
     */
    public function setDescription(?string $description): self
    {
        $this->description = new Description($description);
        return $this;
    }

    /**
     * @param null|int $tokenCredit 
     * @return UpdatePlanCommand 
     */
    public function setTokenCredit(?int $tokenCredit): self
    {
        $this->tokenCredit = new Count($tokenCredit);
        return $this;
    }

    /**
     * @param null|int $imageCredit 
     * @return UpdatePlanCommand 
     */
    public function setImageCredit(?int $imageCredit): self
    {
        $this->imageCredit = new Count($imageCredit);
        return $this;
    }

    /**
     * @param null|int $audioCredit 
     * @return UpdatePlanCommand 
     */
    public function setAudioCredit(?int $audioCredit): self
    {
        $this->audioCredit = new Count($audioCredit);
        return $this;
    }

    /**
     * @param int $superiority 
     * @return UpdatePlanCommand 
     */
    public function setSuperiority(int $superiority): self
    {
        $this->superiority = new Superiority($superiority);
        return $this;
    }

    /**
     * @param int $status 
     * @return UpdatePlanCommand 
     */
    public function setStatus(int $status): self
    {
        $this->status = Status::from($status);
        return $this;
    }

    /**
     * @param bool $isFeatured 
     * @return UpdatePlanCommand 
     */
    public function setIsFeatured(bool $isFeatured): self
    {
        $this->isFeatured = new IsFeatured($isFeatured);
        return $this;
    }

    /**
     * @param null|string $icon 
     * @return UpdatePlanCommand 
     */
    public function setIcon(?string $icon): self
    {
        $this->icon = new Icon($icon);
        return $this;
    }

    /**
     * @param string ...$features
     * @return UpdatePlanCommand
     */
    public function setFeatureList(string ...$features): self
    {
        $this->featureList = new FeatureList(...$features);
        return $this;
    }
}
