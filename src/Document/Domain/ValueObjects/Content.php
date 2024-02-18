<?php

declare(strict_types=1);

namespace Document\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

#[ORM\Embeddable]
class Content implements JsonSerializable
{
    #[ORM\Column(type: Types::TEXT, name: "output", nullable: true)]
    public readonly ?string $value;

    /**
     * @param null|string $value 
     * @return void 
     */
    public function __construct(?string $value = null)
    {
        $this->value = $value;
    }

    /** @return null|string  */
    public function jsonSerialize(): ?string
    {
        return $this->value;
    }
}
