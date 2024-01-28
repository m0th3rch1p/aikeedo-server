<?php

declare(strict_types=1);

namespace Document\Domain\Entities;

use DateTime;
use DateTimeInterface;
use Doctrine\ORM\Mapping as ORM;
use Document\Domain\ValueObjects\Content;
use Document\Domain\ValueObjects\Title;
use Preset\Domain\Entities\PresetEntity;
use Shared\Domain\ValueObjects\Id;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Domain\Entities
 */
#[ORM\Entity]
#[ORM\Table(name: 'document')]
class DocumentEntity
{
    /**
     * A unique numeric identifier of the entity. Set this property
     * programmatically.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Embedded(class: Title::class, columnPrefix: false)]
    private Title $title;

    #[ORM\Embedded(class: Content::class, columnPrefix: false)]
    private Content $content;

    /** Creation date and time of the entity */
    #[ORM\Column(type: 'datetime', name: 'created_at')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: 'datetime', name: 'updated_at', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    #[ORM\ManyToOne(targetEntity: UserEntity::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private UserEntity $user;

    #[ORM\ManyToOne(targetEntity: PresetEntity::class)]
    #[ORM\JoinColumn(onDelete: 'SET NULL')]
    private ?PresetEntity $preset = null;

    /**
     * @param Title $title 
     * @param UserEntity $user 
     * @param null|PresetEntity $preset 
     * @return void 
     */
    public function __construct(
        Title $title,
        UserEntity $user,
        ?PresetEntity $preset = null
    ) {
        $this->id = new Id();
        $this->title = $title;
        $this->content = new Content();
        $this->user = $user;
        $this->preset = $preset;
        $this->createdAt = new \DateTime();
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
     * @return DocumentEntity 
     */
    public function setTitle(Title $title): self
    {
        $this->title = $title;
        return $this;
    }

    /** @return Content  */
    public function getContent(): Content
    {
        return $this->content;
    }

    /**
     * @param Content $output 
     * @return DocumentEntity 
     */
    public function setContent(Content $output): self
    {
        $this->content = $output;
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

    /** @return UserEntity  */
    public function getUser(): UserEntity
    {
        return $this->user;
    }

    /** @return null|PresetEntity  */
    public function getPreset(): ?PresetEntity
    {
        return $this->preset;
    }

    /** @return void  */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    /**
     * @param Id|UserEntity $user 
     * @return bool 
     */
    public function isAuthoredBy(Id|UserEntity $user): bool
    {
        $userId = $user instanceof UserEntity ? $user->getId() : $user;
        return $this->user->getId() == $userId;
    }
}
