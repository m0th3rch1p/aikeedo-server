<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO\Exceptions;

use Exception;
use Throwable;

class IdentityProviderNotFoundException extends Exception
{
    public function __construct(
        public readonly string $platform,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        parent::__construct(
            "Identity provider not found for platform: {$platform}",
            $code,
            $previous
        );
    }
}
