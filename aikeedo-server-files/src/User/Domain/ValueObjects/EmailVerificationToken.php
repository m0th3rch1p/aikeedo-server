<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

#[ORM\Embeddable]
class EmailVerificationToken implements JsonSerializable
{
    #[ORM\Column(type: Types::STRING, name: "email_verification_token", nullable: true)]
    public readonly ?string $value;

    public function __construct(?string $value = null)
    {
        $this->value = $value;
    }

    public function jsonSerialize(): ?string
    {
        return $this->value;
    }
}
