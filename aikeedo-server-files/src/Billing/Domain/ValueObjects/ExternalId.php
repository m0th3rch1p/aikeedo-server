<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

#[ORM\Embeddable]
class ExternalId implements JsonSerializable
{
    #[ORM\Column(type: Types::STRING, name: "external_id", nullable: true)]
    public readonly ?string $value;

    /**
     * @param null|string $value 
     * @return void 
     */
    public function __construct(?string $value = null)
    {
        $this->value = $value;
    }

    /** @inheritDoc */
    public function jsonSerialize(): ?string
    {
        return $this->value;
    }
}
