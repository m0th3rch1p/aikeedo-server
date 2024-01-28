<?php

declare(strict_types=1);

namespace Document\Domain\ValueObjects;

use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;
use Shared\Domain\Exceptions\InvalidValueException;

#[ORM\Embeddable]
class Title implements JsonSerializable
{
    #[ORM\Column(type: 'string', name: "title", length: 255)]
    public readonly string $value;

    /**
     * @param string $value 
     * @return void 
     * @throws InvalidValueException 
     */
    public function __construct(string $value)
    {
        $this->ensureValueIsValid($value);
        $this->value = $value;
    }

    /** @inheritDoc */
    public function jsonSerialize(): string
    {
        return $this->value;
    }

    /**
     * @param string $value 
     * @return void 
     * @throws InvalidValueException 
     */
    private function ensureValueIsValid(string $value): void
    {
        if (mb_strlen($value) > 255) {
            throw new InvalidValueException(sprintf(
                '<%s> does not allow the value <%s>. Maximum <%s> characters allowed.',
                static::class,
                $value,
                255
            ));
        }
    }
}
