<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Shared\Domain\Exceptions\InvalidValueException;

/** @package User\Domain\ValueObjects */
#[ORM\Embeddable]
class PasswordHash
{
    #[ORM\Column(type: Types::STRING, name: "password_hash", nullable: true)]
    public readonly ?string $value;

    public function __construct(?string $value = null)
    {
        $this->ensureValueIsValid($value);
        $this->value = $value;
    }

    private function ensureValueIsValid(?string $value)
    {
        if (!is_null($value) && mb_strlen($value) > 150) {
            throw new InvalidValueException(sprintf(
                '<%s> does not allow the value <%s>. Maximum 150 characters allowed.',
                static::class,
                $value
            ));
        }
    }
}
