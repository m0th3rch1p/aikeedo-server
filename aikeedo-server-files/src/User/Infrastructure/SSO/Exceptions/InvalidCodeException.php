<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO\Exceptions;

use Exception;
use Throwable;

class InvalidCodeException extends Exception
{
    public function __construct(
        public readonly string $exchangeCode,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        parent::__construct("Invalid excahgne code: {$exchangeCode}", $code, $previous);
    }
}
