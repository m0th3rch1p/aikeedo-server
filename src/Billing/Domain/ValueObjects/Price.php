<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;
use Shared\Domain\Exceptions\InvalidValueException;

/** @package Plan\Domain\ValueObjects */
#[ORM\Embeddable]
class Price implements JsonSerializable
{
    #[ORM\Column(type: Types::INTEGER, name: "price")]
    public readonly int $value;

    /**
     * @param int $value 
     * @return void 
     * @throws InvalidValueException 
     */
    public function __construct(int $value)
    {
        $this->ensureValueIsValid($value);
        $this->value = $value;
    }

    /** @return int  */
    public function jsonSerialize(): int
    {
        return $this->value;
    }

    /**
     * @param int $value 
     * @return void 
     * @throws InvalidValueException 
     */
    private function ensureValueIsValid(int $value): void
    {
        if ($value < 0) {
            throw new InvalidValueException(sprintf(
                '<%s> does not allow the value <%s>. Value must greater than 0.',
                static::class,
                $value
            ));
        }
    }
}
