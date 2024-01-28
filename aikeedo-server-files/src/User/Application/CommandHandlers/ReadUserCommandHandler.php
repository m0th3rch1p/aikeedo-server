<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\ReadUserCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Services\ReadUserService;

/** @package User\Application\CommandHandlers */
class ReadUserCommandHandler
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
     * @param ReadUserCommand $query
     * @return UserEntity
     * @throws UserNotFoundException
     */
    public function handle(ReadUserCommand $query): UserEntity
    {
        return $this->service->findUserOrFail($query->id);
    }
}
