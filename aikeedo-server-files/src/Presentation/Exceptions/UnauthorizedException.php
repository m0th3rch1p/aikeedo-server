<?php

namespace Presentation\Exceptions;

use Easy\Http\Message\StatusCode;
use Throwable;

class UnauthorizedException extends HttpException
{
    public function __construct(
        ?string $message = 'You are not authorized to access this resource.',
        ?string $param = null,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, StatusCode::UNAUTHORIZED, $param, $previous);
    }
}
