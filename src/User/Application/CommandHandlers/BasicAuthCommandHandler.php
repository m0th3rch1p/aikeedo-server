<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\BasicAuthCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Exceptions\InvalidPasswordException;
use User\Domain\Services\ReadUserService;

/** @package User\Application\CommandHandlers */
class BasicAuthCommandHandler
{
    /**
     * @param ReadUserService $service 
     * @return void 
     */
    public function __construct(
        private ReadUserService $service
    ) {
    }

    /**
     * @param BasicAuthCommand $cmd 
     * @return UserEntity 
     * @throws UserNotFoundException 
     * @throws InvalidPasswordException 
     */
    public function handle(BasicAuthCommand $cmd): UserEntity
    {
        $user = $this->service->findUserOrFail($cmd->email);
        $user->verifyPassword($cmd->password);

        return $user;
    }
}
