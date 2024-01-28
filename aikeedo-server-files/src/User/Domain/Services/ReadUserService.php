<?php

declare(strict_types=1);

namespace User\Domain\Services;

use Shared\Domain\ValueObjects\Id;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Repositories\UserRepositoryInterface;
use User\Domain\ValueObjects\Email;

/** @package User\Domain\Services */
class ReadUserService
{
    /**
     * @param UserRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private UserRepositoryInterface $repo
    ) {
    }

    /**
     * @param Id|Email $id 
     * @return UserEntity 
     * @throws UserNotFoundException 
     */
    public function findUserOrFail(Id|Email $id): UserEntity
    {
        return $id instanceof Id
            ? $this->repo->ofId($id)
            : $this->repo->ofEmail($id);
    }
}
