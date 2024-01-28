<?php

declare(strict_types=1);

namespace Option\Domain\Entities;

use DateTime;
use DateTimeInterface;
use Doctrine\ORM\Mapping as ORM;
use Option\Domain\ValueObjects\Key;
use Option\Domain\ValueObjects\Value;
use Shared\Domain\ValueObjects\Id;

/**
 * @package Option\Domain\Entities
 */
#[ORM\Entity]
#[ORM\Table(name: '`option`')]
class OptionEntity
{
    /**
     * A unique numeric identifier of the entity. Don't set this property
     * programmatically. It is automatically set by Doctrine ORM.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Embedded(class: Key::class, columnPrefix: false)]
    private Key $key;

    #[ORM\Embedded(class: Value::class, columnPrefix: false)]
    private Value $value;

    /** Creation date and time of the entity */
    #[ORM\Column(type: 'datetime', name: 'created_at')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: 'datetime', name: 'updated_at', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    /**
     * @param Key $key 
     * @param Value $value 
     * @return void 
     */
    public function __construct(
        Key $key,
        Value $value
    ) {
        $this->id = new Id();
        $this->key = $key;
        $this->value = $value;
        $this->createdAt = new DateTime();
    }

    /**
     * @return Id
     */
    public function getId(): Id
    {
        return $this->id;
    }

    /** @return Key */
    public function getKey(): Key
    {
        return $this->key;
    }

    /** @return Value */
    public function getValue(): Value
    {
        return $this->value;
    }

    /**
     * @param Value $value
     * @return void
     */
    public function setValue(Value $value): void
    {
        if (!$this->value->value) {
            $this->value = $value;
            return;
        }

        $current = json_decode($this->value->value, true);
        if (!$current) {
            $this->value = $value;
            return;
        }

        $new = json_decode($value->value, true);
        if (!$new) {
            $this->value = $value;
            return;
        }

        $this->value = new Value(json_encode(array_merge($current, $new)));
    }

    /**
     * @return DateTimeInterface
     */
    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    /**
     * @return null|DateTimeInterface
     */
    public function getUpdatedAt(): ?DateTimeInterface
    {
        return $this->updatedAt;
    }

    /**
     * @return void
     */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }
}
