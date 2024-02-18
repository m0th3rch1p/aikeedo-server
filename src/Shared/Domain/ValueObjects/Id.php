<?php

declare(strict_types=1);

namespace Shared\Domain\ValueObjects;

use Doctrine\ORM\Mapping as ORM;
use JsonSerializable;
use Ramsey\Uuid\Doctrine\UuidV7Generator;
use Ramsey\Uuid\Exception\UnsupportedOperationException;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

/** @package Shared\Domain\ValueObjects */
#[ORM\Embeddable]
class Id implements JsonSerializable
{
    #[ORM\Id]
    #[ORM\Column(name: "id", type: "uuid_binary", unique: true)]
    #[ORM\GeneratedValue(strategy: "NONE")]
    #[ORM\CustomIdGenerator(class: UuidV7Generator::class)]
    private UuidInterface $value;

    /**
     * @param null|string $value
     * @return void
     * @throws UnsupportedOperationException
     */
    public function __construct(?string $value = null)
    {
        $this->value = is_null($value)
            ? Uuid::uuid7()
            : Uuid::fromString($value);
    }

    /** @return UuidInterface  */
    public function getValue(): UuidInterface
    {
        return $this->value;
    }

    /** @inheritDoc */
    public function jsonSerialize(): string
    {
        return $this->value->toString();
    }
}
