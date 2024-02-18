<?php

declare(strict_types=1);

namespace User\Application\CommandHandlers;

use Psr\EventDispatcher\EventDispatcherInterface;
use User\Application\Commands\CreatePasswordRecoveryCommand;
use User\Domain\Events\PasswordRecoveryCreatedEvent;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\Repositories\UserRepositoryInterface;
use User\Domain\ValueObjects\Status;

/** 
 * Class CreatePasswordRecoveryCommandHandler
 *
 * This class handles the CreatePasswordRecoveryCommand. 
 * It uses UserRepositoryInterface to interact with user data and 
 * EventDispatcherInterface to dispatch events.
 *
 * @package User\Application\CommandHandlers 
 */
class CreatePasswordRecoveryCommandHandler
{
    /**
     * Constructs a new instance of CreatePasswordRecoveryCommandHandler.
     *
     * @param UserRepositoryInterface $repo An instance of UserRepositoryInterface.
     * @param EventDispatcherInterface $dispatcher An instance of EventDispatcherInterface.
     */
    public function __construct(
        private UserRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher
    ) {
    }

    /**
     * Handles the provided CreatePasswordRecoveryCommand.
     *
     * It retrieves the user with the email provided in the command. If the user 
     * status is not active, throws UserNotFoundException. Generates a new 
     * recovery token for the user and then flushes changes to the repository. 
     * Dispatches a PasswordRecoveryCreatedEvent afterwards.
     *
     * @param CreatePasswordRecoveryCommand $cmd The command to handle.
     * @return void
     * @throws UserNotFoundException
     */
    public function handle(CreatePasswordRecoveryCommand $cmd): void
    {
        // Retrieve the user with given email from the repository
        $user = $this->repo->ofEmail($cmd->email);

        // Check if user is active. If not, throw a UserNotFoundException.
        if ($user->getStatus() !== Status::ACTIVE) {
            throw new UserNotFoundException($cmd->email);
        }

        // Generate a recovery token for the user
        $user->generateRecoveryToken();

        // Commit changes to the user repository
        $this->repo->flush();

        // Create and dispatch a new PasswordRecoveryCreatedEvent with the 
        // updated user
        $event = new PasswordRecoveryCreatedEvent($user);
        $this->dispatcher->dispatch($event);
    }
}
