<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;
use Shared\Domain\Exceptions\InvalidValueException;

/** @package Billing\Domain\ValueObjects */
#[ORM\Embeddable]
class TrialPeriodDays implements JsonSerializable
{
    #[ORM\Column(type: Types::INTEGER, name: "trial_period_days", nullable: true)]
    public readonly ?int $value;

    /**
     * @param null|int $value 
     * @return void 
     * @throws InvalidValueException 
     */
    public function __construct(?int $value = null)
    {
        $this->ensureValueIsValid($value);
        $this->value = $value;
    }

    /** @return null|int  */
    public function jsonSerialize(): ?int
    {
        return $this->value;
    }

    /**
     * @param null|int $value 
     * @return void 
     * @throws InvalidValueException 
     */
    private function ensureValueIsValid(?int $value): void
    {
        if (!is_null($value) && $value < 0) {
            throw new InvalidValueException(sprintf(
                '<%s> does not allow the value <%s>. Value must greater than 0.',
                static::class,
                $value
            ));
        }
    }
}
