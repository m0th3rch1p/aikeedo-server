<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

/** 
 * Class RecoveryToken
 *
 * Implements JsonSerializable interface for representing user's recovery 
 * tokens in a serialized manner.
 *
 * @package User\Domain\ValueObjects 
 */
#[ORM\Embeddable]
class RecoveryToken implements JsonSerializable
{
    /**
     * A readonly public property that stores the unique recovery token.
     *
     * @var null|string $value
     */
    #[ORM\Column(type: Types::STRING, name: "recovery_token", nullable: true)]
    public readonly ?string $value;

    /**
     * Constructs a new instance of RecoveryToken and initializes its properties.
     * 
     * @param null|string $value The value of the recovery token.
     */
    public function __construct(?string $value = null)
    {
        $this->value =  $value;
    }

    /**
     * Returns the json serialized format of this object.
     *
     * @return null|string The JSON serialized representation of this object.
     */
    public function jsonSerialize(): ?string
    {
        return $this->value;
    }
}
