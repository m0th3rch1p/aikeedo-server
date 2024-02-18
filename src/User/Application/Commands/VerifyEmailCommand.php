<?php

declare(strict_types=1);

namespace User\Application\Commands;

use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Application\CommandHandlers\VerifyEmailCommandHandler;
use User\Domain\Entities\UserEntity;
use User\Domain\ValueObjects\Email;
use User\Domain\ValueObjects\EmailVerificationToken;

#[Handler(VerifyEmailCommandHandler::class)]
class VerifyEmailCommand
{
    public Id|Email|UserEntity $id;
    public EmailVerificationToken $token;

    public function __construct(
        string|Id|Email|UserEntity $id,
        string $token
    ) {
        $this->id = is_string($id) ? new Id($id) : $id;
        $this->token = new EmailVerificationToken($token);
    }
}
