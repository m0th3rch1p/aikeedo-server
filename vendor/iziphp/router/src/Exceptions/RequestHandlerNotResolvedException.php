<?php

declare(strict_types=1);

namespace Easy\Router\Exceptions;

use Throwable;

/** @package Easy\Router\Exceptions */
class RequestHandlerNotResolvedException extends Exception
{
    /**
     * @param string $handler
     * @return void
     */
    public function __construct(
        private string $handler,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        parent::__construct(
            "Request handler '$handler' not resolved",
            $code,
            $previous
        );
    }

    /** @return string  */
    public function getHandler(): string
    {
        return $this->handler;
    }
}
