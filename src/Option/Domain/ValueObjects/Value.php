<?php

declare(strict_types=1);

namespace Option\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

#[ORM\Embeddable]
class Value implements JsonSerializable
{
    #[ORM\Column(type: Types::TEXT, name: "value", nullable: true)]
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
