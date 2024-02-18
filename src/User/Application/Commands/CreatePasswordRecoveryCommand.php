<?php

declare(strict_types=1);

namespace User\Application\Commands;

use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Application\CommandHandlers\CreatePasswordRecoveryCommandHandler;
use User\Domain\ValueObjects\Email;

/** 
 * Class CreatePasswordRecoveryCommand
 *
 * This is a command to create a password recovery. It is handled by 
 * CreatePasswordRecoveryCommandHandler.
 *
 * @package User\Application\Commands 
 */
#[Handler(CreatePasswordRecoveryCommandHandler::class)]
class CreatePasswordRecoveryCommand
{
    // This property holds the Email value object of the user requesting 
    // password recovery.
    public Email $email;

    /**
     * Constructs a new instance of CreatePasswordRecoveryCommand.
     *
     * The constructor accepts either an Email object or a string. If a string 
     * is provided, it's assumed to be a valid email address and will be used to
     * create a new Email object.
     *
     * @param string|Email $email The Email object of user or a valid email 
     * address as a string.
     */
    public function __construct(string|Email $email)
    {
        // If email is string, a new Email object is created otherwise input 
        // email object is used.
        $this->email = is_string($email) ? new Email($email) : $email;
    }
}
