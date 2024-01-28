<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\DeleteUserCommand;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Services\DeleteUserService;

/** @package User\Application\CommandHandlers */
class DeleteUserCommandHandler
{
    /**
     * @param DeleteUserService $service
     * @return void
     */
    public function __construct(
        private DeleteUserService $service
    ) {
    }

    /**
     * @param DeleteUserCommand $cmd
     * @return void
     * @throws UserNotFoundException
     */
    public function handle(DeleteUserCommand $cmd): void
    {
        $user = $this->service->findUserOrFail($cmd->id);
        $this->service->deleteUser($user);
    }
}
