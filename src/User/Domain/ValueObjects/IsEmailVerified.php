<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

#[ORM\Embeddable]
class IsEmailVerified implements JsonSerializable
{
    #[ORM\Column(type: Types::BOOLEAN, name: "is_email_verified", nullable: true)]
    public readonly ?bool $value;

    public function __construct(bool $value = false)
    {
        $this->value = $value;
    }

    public function jsonSerialize(): bool
    {
        return $this->value ?? false;
    }
}
