<?php

declare(strict_types=1);

namespace User\Domain\Services;

use Psr\EventDispatcher\EventDispatcherInterface;
use User\Domain\Entities\UserEntity;
use User\Domain\Events\UserEmailUpdatedEvent;
use User\Domain\Events\UserPasswordUpdatedEvent;
use User\Domain\Events\UserUpdatedEvent;
use User\Domain\Exceptions\EmailTakenException;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Repositories\UserRepositoryInterface;

/** @package User\Domain\Services */
class UpdateUserService extends ReadUserService
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
    public function updateUser(UserEntity $user): void
    {
        // Call the pre update hooks
        $user->preUpdate();

        // Update the user in the repository
        $this->repo->flush();

        // Dispatch the user updated event
        $event = new UserUpdatedEvent($user);
        $this->dispatcher->dispatch($event);
    }

    /**
     * @param UserEntity $user
     * @return void
     */
    public function updatePassword(UserEntity $user): void
    {
        $this->updateUser($user);

        // Dispatch the user password updated event
        $event = new UserPasswordUpdatedEvent($user);
        $this->dispatcher->dispatch($event);
    }

    /**
     * @param UserEntity $user
     * @return void
     * @throws EmailTakenException
     */
    public function updateEmail(UserEntity $user): void
    {
        try {
            $otherUser = $this->repo->ofEmail($user->getEmail());

            if ($otherUser->getId() != $user->getId()) {
                throw new EmailTakenException($user->getEmail());
            }
        } catch (UserNotFoundException $th) {
            // Do nothing
        }


        $this->updateUser($user);

        // Dispatch the user email updated event
        $event = new UserEmailUpdatedEvent($user);
        $this->dispatcher->dispatch($event);
    }
}
