<?php

declare(strict_types=1);

namespace Presentation\Exceptions;

use Easy\Http\Message\StatusCode;
use Exception;
use Throwable;

/** @package Presentation\Exceptions */
class HttpException extends Exception
{
    /**
     * @param null|string $message 
     * @param StatusCode $statusCode 
     * @param null|string $param 
     * @param null|Throwable $previous 
     * @return void 
     */
    public function __construct(
        ?string $message = null,
        public readonly StatusCode $statusCode = StatusCode::UNPROCESSABLE_ENTITY,
        public readonly ?string $param = null,
        ?Throwable $previous = null
    ) {
        if (is_null($message)) {
            $message = $previous ? $previous->getMessage() : '';
        }

        parent::__construct($message, $statusCode->value, $previous);
    }
}
