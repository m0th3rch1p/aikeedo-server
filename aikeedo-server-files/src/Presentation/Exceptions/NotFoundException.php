<?php

declare(strict_types=1);

namespace Presentation\Exceptions;

use Easy\Http\Message\StatusCode;
use Throwable;

/** @package Presentation\Exceptions */
class NotFoundException extends HttpException
{
    /**
     * @param string $message 
     * @param null|string $param 
     * @param null|Throwable $previous 
     * @return void 
     */
    public function __construct(
        ?string $message = null,
        ?string $param = null,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, StatusCode::NOT_FOUND, $param, $previous);
    }
}
