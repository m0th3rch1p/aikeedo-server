<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;
use Shared\Domain\Exceptions\InvalidValueException;

/** @package User\Domain\ValueObjects */
#[ORM\Embeddable]
class Language implements JsonSerializable
{
    public const DEFAULT = 'en-US';

    #[ORM\Column(type: Types::STRING, name: "language", length: 5)]
    public readonly string $value;

    /**
     * @param string $value 
     * @return void 
     * @throws InvalidValueException 
     */
    public function __construct(string $value = self::DEFAULT)
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
    private function ensureValueIsValid(string $value)
    {
        if (mb_strlen($value) > 5) {
            throw new InvalidValueException(sprintf(
                '<%s> does not allow the value <%s>. Maximum <%s> characters allowed.',
                static::class,
                $value,
                5
            ));
        }
    }
}
