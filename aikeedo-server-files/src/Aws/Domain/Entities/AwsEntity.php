<?php

declare(strict_types=1);

namespace Aws\Domain\Entities;

use DateTime;
use DateTimeInterface;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\Selectable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\StringValue;
use User\Domain\Entities\UserEntity;

/**
 * @package Aws\Domain\Entities
 */
#[ORM\Entity]
#[ORM\Table(name: 'aws')]
#[ORM\UniqueConstraint(columns: ['user_id', 'customer_id', 'dimension'])]
class AwsEntity
{
    /**
     * A unique numeric identifier of the entity. Don't set this property
     * programmatically. It is automatically set by Doctrine ORM.
     */
    #[ORM\Embedded(class: Id::class, columnPrefix: false)]
    private Id $id;

    #[ORM\Column(name: 'customer_id', length: 255)]
    private string $customer_id;

    #[ORM\Column(name: 'dimension', length: 255)]
    private string $dimension;

    #[ORM\OneToOne(targetEntity: UserEntity::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: true)]
    private UserEntity $user;

    #[ORM\OneToMany(mappedBy: 'aws', targetEntity: AwsUsageEntity::class, cascade: ['persist', 'remove'])]
    private Collection&Selectable $awsUsage;

    /** Creation date and time of the entity */
    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private DateTimeInterface $createdAt;

    /** The date and time when the entity was last modified. */
    #[ORM\Column(name: 'updated_at', type: 'datetime', nullable: true)]
    private ?DateTimeInterface $updatedAt = null;

    /**
     * @return void
     */
    public function __construct(string $customerId, string $dimension)
    {
        $this->id = new Id();
        $this->customer_id = $customerId;
        $this->dimension = $dimension;
        $this->createdAt = new DateTime();
    }

    /**
     * @return Id
     */
    public function getId(): Id
    {
        return $this->id;
    }

    public function getCustomerId(): string
    {
        return $this->customer_id;
    }

    public function getDimension(): string
    {
        return $this->dimension;
    }

    public function getUser(): UserEntity
    {
        return $this->user;
    }

    public function setUser(UserEntity $user): void
    {
        $this->user = $user;
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

    public function getAwsUsages(): Selectable&Collection
    {
        return $this->awsUsage;
    }

    /**
     * @return void
     */
    public function preUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }
}
