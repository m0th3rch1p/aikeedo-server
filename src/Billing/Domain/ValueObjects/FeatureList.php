<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

/** @package Plan\Domain\ValueObjects */
#[ORM\Embeddable]
class FeatureList implements JsonSerializable
{
    #[ORM\Column(type: Types::SIMPLE_ARRAY, name: "feature_list", nullable: true)]
    public readonly array $value;

    /**
     * @param string[] $value
     * @return void
     */
    public function __construct(string ...$value)
    {
        $this->value = $value;
    }

    /** @return string[] */
    public function jsonSerialize(): array
    {
        return $this->value;
    }
}
