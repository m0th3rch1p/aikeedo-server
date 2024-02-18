<?php

declare(strict_types=1);

namespace Easy\Menv\Exceptions;

use Throwable;

/** @package Easy\Menv\Exceptions */
class FileIsNotWritableException extends Exception
{
    public function __construct(
        string $path,
        int $code = 0,
        Throwable $previous = null
    ) {
        $msg = sprintf('Env file at <%s> is not writable.', $path);
        parent::__construct($msg, $code, $previous);
    }
}
