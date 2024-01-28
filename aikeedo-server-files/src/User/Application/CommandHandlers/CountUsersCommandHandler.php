<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use User\Application\Commands\CountUsersCommand;
use User\Domain\Repositories\UserRepositoryInterface;

/** @package User\Application\CommandHandlers */
class CountUsersCommandHandler
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
     * @param CountUsersCommand $cmd 
     * @return int 
     */
    public function handle(CountUsersCommand $cmd): int
    {
        $users = $this->repo;

        if ($cmd->status) {
            $users = $users->filterByStatus($cmd->status);
        }

        if ($cmd->role) {
            $users = $users->filterByRole($cmd->role);
        }

        if ($cmd->query) {
            $users = $users->search($cmd->query);
        }

        return $users->count();
    }
}
