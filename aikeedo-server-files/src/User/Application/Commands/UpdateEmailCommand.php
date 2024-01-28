<?php

declare(strict_types=1);

namespace User\Application\Commands;

use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Application\CommandHandlers\UpdateEmailCommandHandler;
use User\Domain\Entities\UserEntity;
use User\Domain\ValueObjects\Email;
use User\Domain\ValueObjects\Password;

/** @package User\Application\Commands */
#[Handler(UpdateEmailCommandHandler::class)]
class UpdateEmailCommand
{
    public Id|Email|UserEntity $id;
    public Email $email;
    public Password $password;

    /**
     * @param string $id
     * @param string $email
     * @param string $password
     * @return void
     */
    public function __construct(
        string|Id|Email|UserEntity $id,
        string $email,
        string $password
    ) {
        $this->id = is_string($id) ? new Id($id) : $id;
        $this->email = new Email($email);
        $this->password = new Password($password);
    }
}
