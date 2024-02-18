<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use Shared\Domain\ValueObjects\CursorDirection;
use Traversable;
use User\Application\Commands\ListUsersCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Repositories\UserRepositoryInterface;
use User\Domain\Services\ReadUserService;

/** @package User\Application\CommandHandlers */
class ListUsersCommandHandler
{
    /**
     * @param UserRepositoryInterface $repo
     * @param ReadUserService $service
     * @return void
     */
    public function __construct(
        private UserRepositoryInterface $repo,
        private ReadUserService $service
    ) {
    }

    /**
     * @param ListUsersCommand $cmd 
     * @return Traversable<UserEntity>
     * @throws UserNotFoundException 
     */
    public function handle(ListUsersCommand $cmd): Traversable
    {
        $cursor = $cmd->cursor
            ? $this->service->findUserOrFail($cmd->cursor)
            : null;

        $users = $this->repo
            ->sort($cmd->sortDirection, $cmd->sortParameter);

        if ($cmd->status) {
            $users = $users->filterByStatus($cmd->status);
        }

        if ($cmd->role) {
            $users = $users->filterByRole($cmd->role);
        }

        if ($cmd->query) {
            $users = $users->search($cmd->query);
        }

        if ($cmd->maxResults) {
            $users = $users->setMaxResults($cmd->maxResults);
        }

        if ($cursor) {
            if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {
                return $users = $users->endingBefore($cursor);
            }

            return $users->startingAfter($cursor);
        }

        return $users;
    }
}
