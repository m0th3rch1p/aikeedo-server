<?php

namespace Aws\Domain\Entities;

use DateTime;
use Doctrine\DBAL\Types\Type;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Shared\Domain\ValueObjects\Id;
use User\Domain\Entities\UserEntity;

#[ORM\Entity]
#[ORM\Table(name: 'aws_usage')]
class AwsUsageEntity
{
    /**
     * A unique numeric identifier of the entity. Don't set this property
     * programmatically. It is automatically set by Doctrine ORM.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Column(name: 'customer_id', length: 255)]
    private string $customerId;

    #[ORM\Column(name: 'dimension', length: 255)]
    private string $dimension;

    #[ORM\Column(name: 'allocated_audio', type: Types::INTEGER, length: 255)]
    private int $allocatedAudio;

    #[ORM\Column(name: 'allocated_image', type: Types::INTEGER, length: 255)]
    private int $allocatedImage;

    #[ORM\Column(name: 'allocated_token', type: Types::INTEGER, length: 255)]
    private int $allocatedToken;

    #[ORM\Column(name: 'tag', length: 255)]
    private string $tag;

    #[ORM\Column(name: 'quantity', type: Types::INTEGER, length: 255)]
    private int $quantity;

    #[ORM\ManyToOne(targetEntity: AwsEntity::class, cascade: ['persist', 'remove'])]
    #[ORM\JoinColumn(name: 'aws_id')]
    private AwsEntity $aws;

    /** Creation date and time of the entity */
    #[ORM\Column(type: 'datetime', name: 'created_at')]
    private \DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(type: 'datetime', name: 'updated_at', nullable: true)]
    private ?\DateTimeInterface $updatedAt = null;

    /**
     * @return void
     */
    public function __construct(string $customerId, string $dimension, int $allocatedAudio, int $allocatedImage, int $allocatedToken, string $tag,  int $quantity)
    {
        $this->id = new Id();
        $this->customerId = $customerId;
        $this->dimension = $dimension;
        $this->allocatedImage = $allocatedImage;
        $this->allocatedAudio = $allocatedAudio;
        $this->allocatedToken = $allocatedToken;
        $this->tag = $tag;
        $this->quantity = $quantity;
        $this->createdAt = new DateTime();
    }

    public function getCustomerId(): string
    {
        return $this->customerId;
    }

    public function getDimension(): string
    {
        return $this->dimension;
    }

    public function getTag(): string
    {
        return $this->tag;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function getCreatedAt(): DateTimeInterface
    {
        return $this->createdAt;
    }

    /**
     * @return void
     */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    public function getAws(): AwsEntity
    {
        return $this->aws;
    }

    public function setAws(AwsEntity $aws): void
    {
        $this->aws = $aws;
    }

}