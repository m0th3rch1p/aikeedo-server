<?php

declare(strict_types=1);

namespace Preset\Domain\Entities;

use Category\Domain\Entities\CategoryEntity;
use DateTime;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Preset\Domain\Exceptions\LockedPresetException;
use Preset\Domain\ValueObjects\Color;
use Preset\Domain\ValueObjects\Description;
use Preset\Domain\ValueObjects\Image;
use Preset\Domain\ValueObjects\Status;
use Preset\Domain\ValueObjects\Template;
use Preset\Domain\ValueObjects\Title;
use Preset\Domain\ValueObjects\Type;
use Shared\Domain\ValueObjects\Id;

/** @package Preset\Domain\Entities */
#[ORM\Entity]
#[ORM\Table(name: 'preset')]
class PresetEntity
{
    /**
     * A unique numeric identifier of the entity. Set this property
     * programmatically.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Column(type: Types::STRING, enumType: Type::class, name: 'type')]
    private Type $type;

    #[ORM\Column(type: Types::SMALLINT, enumType: Status::class, name: 'status')]
    private Status $status;

    #[ORM\Embedded(class: Title::class, columnPrefix: false)]
    private Title $title;

    #[ORM\Embedded(class: Description::class, columnPrefix: false)]
    private Description $description;

    #[ORM\Embedded(class: Template::class, columnPrefix: false)]
    private Template $template;

    #[ORM\Embedded(class: Image::class, columnPrefix: false)]
    private Image $image;

    #[ORM\Embedded(class: Color::class, columnPrefix: false)]
    private Color $color;

    #[ORM\Column(type: Types::BOOLEAN, name: "is_locked", nullable: false)]
    private bool $isLocked = false;

    /** Creation date and time of the entity */
    #[ORM\Column(type: Types::DATETIME_MUTABLE, name: 'created_at')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: Types::DATETIME_MUTABLE, name: 'updated_at', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    #[ORM\ManyToOne(targetEntity: CategoryEntity::class)]
    #[ORM\JoinColumn(onDelete: "SET NULL")]
    private ?CategoryEntity $category = null;

    /**
     * @param Type $type 
     * @param Title $title 
     * @param Status $status 
     * @return void 
     */
    public function __construct(
        Type $type,
        Title $title,
        Status $status = Status::ACTIVE
    ) {
        $this->id = new Id();
        $this->type = $type;
        $this->status = $status;
        $this->title = $title;
        $this->description = new Description();
        $this->template = new Template();
        $this->image = new Image();
        $this->color = new Color();
        $this->createdAt = new DateTime();
    }

    /** @return Id  */
    public function getId(): Id
    {
        return $this->id;
    }

    /** @return Type  */
    public function getType(): Type
    {
        return $this->type;
    }

    /** @return Status  */
    public function getStatus(): Status
    {
        return $this->status;
    }

    /**
     * @param Status $status 
     * @return PresetEntity 
     */
    public function setStatus(Status $status): self
    {
        $this->status = $status;
        return $this;
    }

    /** @return Title  */
    public function getTitle(): Title
    {
        return $this->title;
    }

    /**
     * @param Title $title 
     * @return PresetEntity 
     */
    public function setTitle(Title $title): self
    {
        $this->title = $title;
        return $this;
    }

    /** @return Description  */
    public function getDescription(): Description
    {
        return $this->description;
    }

    /**
     * @param Description $description 
     * @return PresetEntity 
     */
    public function setDescription(Description $description): self
    {
        $this->description = $description;
        return $this;
    }

    /** @return Template  */
    public function getTemplate(): Template
    {
        return $this->template;
    }

    /**
     * @param Template $template 
     * @return PresetEntity 
     */
    public function setTemplate(Template $template): self
    {
        if ($this->isLocked) {
            throw new LockedPresetException();
        }

        $this->template = $template;
        return $this;
    }

    /** @return Image  */
    public function getImage(): Image
    {
        return $this->image;
    }

    /**
     * @param Image $image 
     * @return PresetEntity 
     */
    public function setImage(Image $image): self
    {
        $this->image = $image;
        return $this;
    }

    /** @return Color  */
    public function getColor(): Color
    {
        return $this->color;
    }

    /**
     * @param Color $color 
     * @return PresetEntity 
     */
    public function setColor(Color $color): self
    {
        $this->color = $color;
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

    /** @return CategoryEntity|null  */
    public function getCategory(): ?CategoryEntity
    {
        return $this->category;
    }

    /**
     * @param CategoryEntity|null $category 
     * @return PresetEntity 
     */
    public function setCategory(?CategoryEntity $category): self
    {
        $this->category = $category;
        return $this;
    }

    /** 
     * Locked presets' template and settings cannot be modified.
     * Once a preset is locked, it cannot be unlocked.
     * 
     * @return void
     */
    public function lock(): void
    {
        $this->isLocked = true;
    }

    /** @return bool */
    public function isLocked(): bool
    {
        return $this->isLocked;
    }

    /** @return void  */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }
}
