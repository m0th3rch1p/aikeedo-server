<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

/** @package Plan\Domain\ValueObjects */
#[ORM\Embeddable]
class Description implements JsonSerializable
{
    #[ORM\Column(type: Types::TEXT, name: "description", nullable: true)]
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
