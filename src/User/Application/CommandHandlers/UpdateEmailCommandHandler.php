<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\UpdateEmailCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Exceptions\InvalidPasswordException;
use User\Domain\Exceptions\EmailTakenException;
use User\Domain\Services\UpdateUserService;

/** @package User\Application\CommandHandlers */
class UpdateEmailCommandHandler
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
     * @param UpdateEmailCommand $cmd
     * @return UserEntity
     * @throws UserNotFoundException
     * @throws InvalidPasswordException
     * @throws EmailTakenException
     */
    public function handle(UpdateEmailCommand $cmd): UserEntity
    {
        $user = $cmd->id instanceof UserEntity
            ? $cmd->id
            : $this->service->findUserOrFail($cmd->id);

        if ($cmd->email->value === $user->getEmail()->value) {
            return $user;
        }

        $user->updateEmail(
            $cmd->email,
            $cmd->password
        );

        $this->service->updateEmail($user);
        return $user;
    }
}
