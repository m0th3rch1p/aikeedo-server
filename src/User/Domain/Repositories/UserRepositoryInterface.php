<?php

declare(strict_types=1);

namespace User\Domain\Repositories;

use DateTimeInterface;
use Iterator;
use Shared\Domain\Repositories\RepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\ValueObjects\Email;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\SortParameter;
use User\Domain\ValueObjects\Status;

/** @package User\Domain\Repositories */
interface UserRepositoryInterface extends RepositoryInterface
{
    /**
     * Add new user entity to the repository
     *
     * @param UserEntity $user
     * @return self
     */
    public function add(UserEntity $user): self;

    /**
     * Remove the user entity from the repository
     *
     * @param UserEntity $user
     * @return self
     */
    public function remove(UserEntity $user): self;

    /**
     * Find user entity by id
     *
     * @param Id $id
     * @return UserEntity
     * @throws UserNotFoundException
     */
    public function ofId(Id $id): UserEntity;

    /**
     * Find a single user entity by email
     *
     * @param Email $email
     * @return UserEntity
     * @throws UserNotFoundException
     */
    public function ofEmail(Email $email): UserEntity;

    /**
     * @param Role $role
     * @return self
     */
    public function filterByRole(Role $role): self;

    /**
     * @param Status $status
     * @return UserRepositoryInterface
     */
    public function filterByStatus(Status $status): self;

    /**
     * Filter user entities collection by the created after the date
     *
     * @param DateTimeInterface $date
     * @return self
     */
    public function createdAfter(DateTimeInterface $date): self;

    /**
     * Filter user entities collection by the created before the date
     *
     * @param DateTimeInterface $date
     * @return self
     */
    public function createdBefore(DateTimeInterface $date): self;

    /**
     * @param string $terms 
     * @return UserRepositoryInterface 
     */
    public function search(string $terms): self;

    /**
     * @param SortDirection $dir 
     * @param null|SortParameter $sortParameter
     * @return static 
     */
    public function sort(
        SortDirection $dir,
        ?SortParameter $sortParameter = null
    ): static;

    /**
     * @param UserEntity $cursor 
     * @return Iterator<UserEntity> 
     */
    public function startingAfter(UserEntity $cursor): Iterator;

    /**
     * @param UserEntity $cursor 
     * @return Iterator<UserEntity> 
     */
    public function endingBefore(UserEntity $cursor): Iterator;
}
