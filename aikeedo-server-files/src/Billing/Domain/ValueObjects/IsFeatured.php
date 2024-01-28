<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;

/** 
 * @package Billing\Domain\ValueObjects 
 * 
 * This is a class representing the IsFeatured value object. It is an Embeddable 
 * class in Doctrine, meaning it is a complex field type that can be embedded 
 * in entities.
 */
#[ORM\Embeddable]
class IsFeatured implements JsonSerializable
{
    // Indicates that the value should be stored as a boolean in the database 
    // under the column name "is_featured". It is readonly so it cannot be 
    // changed after being set
    #[ORM\Column(type: Types::BOOLEAN, name: "is_featured")]
    public readonly bool $value;

    /**
     * This is the constructor method that is automatically called upon class 
     * instantiation. It accepts a boolean value which will be stored as the 
     * $value property.
     * 
     * @param bool $value
     */
    public function __construct(bool $value = false)
    {
        $this->value = $value;
    }

    /** 
     * This is part of the JsonSerializable interface, allows the object to be 
     * serialized into a boolean.
     *
     * @return bool 
     */
    public function jsonSerialize(): bool
    {
        return $this->value;
    }
}
