<?php

declare(strict_types=1);

namespace Category\Domain\Entities;

use Category\Domain\ValueObjects\Title;
use DateTime;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Shared\Domain\ValueObjects\Id;

#[ORM\Entity]
#[ORM\Table(name: 'category')]
class CategoryEntity
{
    /**
     * A unique numeric identifier of the entity. Set this property
     * programmatically.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Embedded(class: Title::class, columnPrefix: false)]
    private Title $title;

    /** Creation date and time of the entity */
    #[ORM\Column(type: Types::DATETIME_MUTABLE, name: 'created_at')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: Types::DATETIME_MUTABLE, name: 'updated_at', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    /**
     * @param Title $title 
     * @return void 
     */
    public function __construct(
        Title $title
    ) {
        $this->id = new Id();
        $this->title = $title;
        $this->createdAt = new DateTime();
    }

    /** @return Id  */
    public function getId(): Id
    {
        return $this->id;
    }

    /** @return Title  */
    public function getTitle(): Title
    {
        return $this->title;
    }

    /**
     * @param Title $title 
     * @return CategoryEntity 
     */
    public function setTitle(Title $title): self
    {
        $this->title = $title;
        return $this;
    }

    /** @return DateTimeInterface  */
    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    /** @return null|DateTimeInterface  */
    public function getUpdatedAt(): ?DateTimeInterface
    {
        return $this->updatedAt;
    }

    /** @return void  */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }
}
