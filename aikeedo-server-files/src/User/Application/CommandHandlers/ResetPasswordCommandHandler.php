<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\ResetPasswordCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Exceptions\InvalidTokenException;
use User\Domain\Services\UpdateUserService;

/** @package User\Application\CommandHandlers */
class ResetPasswordCommandHandler
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
     * @param ResetPasswordCommand $cmd
     * @return UserEntity
     * @throws UserNotFoundException
     * @throws InvalidTokenException
     */
    public function handle(ResetPasswordCommand $cmd): UserEntity
    {
        $user = $cmd->id instanceof UserEntity
            ? $cmd->id
            : $this->service->findUserOrFail($cmd->id);

        $user->resetPassword($cmd->token, $cmd->newPassword);

        $this->service->updatePassword($user);
        return $user;
    }
}
