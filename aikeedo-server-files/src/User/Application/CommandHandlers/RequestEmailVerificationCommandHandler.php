<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\RequestEmailVerificationCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Services\UpdateUserService;

class RequestEmailVerificationCommandHandler
{
    public function __construct(
        private UpdateUserService $service
    ) {
    }

    public function handle(
        RequestEmailVerificationCommand $cmd
    ): UserEntity {
        $user = $cmd->id instanceof UserEntity
            ? $cmd->id
            : $this->service->findUserOrFail($cmd->id);

        $user->unverifyEmail();
        $this->service->updateEmail($user);

        return $user;
    }
}
