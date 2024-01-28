<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\VerifyEmailCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Services\UpdateUserService;

class VerifyEmailCommandHandler
{
    public function __construct(
        private UpdateUserService $service
    ) {
    }

    public function handle(VerifyEmailCommand $cmd): UserEntity
    {
        $user =  $cmd->id instanceof UserEntity
            ? $cmd->id
            : $this->service->findUserOrFail($cmd->id);

        if ($user->isEmailVerified()->value) {
            return $user;
        }

        $user->verifyEmail($cmd->token);
        $this->service->updateUser($user);

        return $user;
    }
}
