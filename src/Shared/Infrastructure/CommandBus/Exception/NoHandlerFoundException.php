<?php

declare(strict_types=1);

namespace Shared\Infrastructure\CommandBus\Exception;

use Exception;
use Throwable;

/** @package Shared\Infrastructure\CommandBus\Exception */
class NoHandlerFoundException extends Exception
{
    /**
     * @param object $cmd The command/query that was not handled
     * @param int $code The error code (default 0)
     * @param null|Throwable $previous The previous exception (default null)
     * @return void
     */
    public function __construct(
        object $cmd,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        // Set the message for the exception
        $message = sprintf(
            'No handler found for command/query %s',
            $cmd::class
        );

        parent::__construct($message, $code, $previous);
    }
}
