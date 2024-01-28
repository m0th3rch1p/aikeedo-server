<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\UpdatePasswordCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Exceptions\InvalidPasswordException;
use User\Domain\Services\UpdateUserService;

/** @package User\Application\CommandHandlers */
class UpdatePasswordCommandHandler
{
    /**
     * @param UpdateUserService $service
     * @return void
     */
    public function __construct(
        private UpdateUserService $service
    ) {
    }

    /**
     * @param UpdatePasswordCommand $cmd
     * @return UserEntity
     * @throws UserNotFoundException
     * @throws InvalidPasswordException
     */
    public function handle(UpdatePasswordCommand $cmd): UserEntity
    {
        $user = $cmd->id instanceof UserEntity
            ? $cmd->id
            : $this->service->findUserOrFail($cmd->id);

        $user->updatePassword(
            $cmd->currentPassword,
            $cmd->newPassword
        );

        $this->service->updatePassword($user);
        return $user;
    }
}
