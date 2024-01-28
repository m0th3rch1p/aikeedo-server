<?php

declare(strict_types=1);

namespace User\Domain\Services;

use Psr\EventDispatcher\EventDispatcherInterface;
use User\Domain\Entities\UserEntity;
use User\Domain\Events\UserDeletedEvent;
use User\Domain\Repositories\UserRepositoryInterface;

/** @package User\Domain\Services */
class DeleteUserService extends ReadUserService
{
    /**
     * @param UserRepositoryInterface $repo
     * @param EventDispatcherInterface $dispatcher
     * @return void
     */
    public function __construct(
        private UserRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher
    ) {
        parent::__construct($repo);
    }

    /**
     * @param UserEntity $user
     * @return void
     */
    public function deleteUser(UserEntity $user): void
    {
        // Remove the user's active subscription
        $user->removeActiveSubscription();
        $this->repo->flush();

        // Delete the user from the repository
        $this->repo
            ->remove($user)
            ->flush();

        // Dispatch the user deleted event
        $event = new UserDeletedEvent($user);
        $this->dispatcher->dispatch($event);
    }
}
