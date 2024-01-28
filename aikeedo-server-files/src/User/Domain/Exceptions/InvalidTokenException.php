<?php

declare(strict_types=1);

namespace User\Domain\Exceptions;

use Exception;
use Throwable;
use User\Domain\Entities\UserEntity;
use User\Domain\ValueObjects\EmailVerificationToken;
use User\Domain\ValueObjects\RecoveryToken;

class InvalidTokenException extends Exception
{
    public function __construct(
        public readonly UserEntity $user,
        public readonly RecoveryToken|EmailVerificationToken $token,
        int $code = 0,
        Throwable $previous = null
    ) {
        parent::__construct(
            $token instanceof RecoveryToken
                ? "Recovery token is incorrect for user!"
                : "Email verification token is incorrect for user!",
            $code,
            $previous
        );
    }
}
