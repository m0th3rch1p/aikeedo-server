<?php

declare(strict_types=1);

// The namespace for this class that belongs to User Application commands.
namespace User\Application\Commands;

use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Application\CommandHandlers\ResetPasswordCommandHandler;
use User\Domain\Entities\UserEntity;
use User\Domain\ValueObjects\Email;
use User\Domain\ValueObjects\Password;
use User\Domain\ValueObjects\RecoveryToken;

/** 
 * Class ResetPasswordCommand
 *
 * This is a command to reset a user's password. It is handled by 
 * ResetPasswordCommandHandler.
 *
 * @package User\Application\Commands 
 */
#[Handler(ResetPasswordCommandHandler::class)]
class ResetPasswordCommand
{
    // This property holds the Id or Email object or User entity of the user 
    // requesting password reset.
    public Id|Email|UserEntity $id;

    // This property holds the RecoveryToken object.
    public RecoveryToken $token;

    // This property holds the new Password object.
    public Password $newPassword;

    /**
     * Constructs a new instance of ResetPasswordCommand.
     *
     * The constructor accepts Id, Email or UserEntity object or a string as 
     * user id, a recovery token and a new password. If a string is provided as 
     * user id, it's assumed to be a valid id and will be used to create a new 
     * Id object.
     *
     * @param string|Id|Email|UserEntity $id The Id, Email or UserEntity object 
     * of the user or a valid id as a string.
     * @param string $recoveryToken The recovery token as a string.
     * @param string $newPassword The new password as a string.
     */
    public function __construct(
        string|Id|Email|UserEntity $id,
        string $recoveryToken,
        string $newPassword
    ) {
        // If id is string, a new Id object is created otherwise input Id, 
        // Email or UserEntity object is used.
        $this->id = is_string($id) ? new Id($id) : $id;

        // A new RecoveryToken object is created with recovery token string.
        $this->token = new RecoveryToken($recoveryToken);

        // A new Password object is created with new password string.
        $this->newPassword = new Password($newPassword);
    }
}
