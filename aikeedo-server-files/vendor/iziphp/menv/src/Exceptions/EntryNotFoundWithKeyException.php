<?php

declare(strict_types=1);

namespace Easy\Menv\Exceptions;

use Throwable;

/** @package Easy\Menv\Exceptions */
class EntryNotFoundWithKeyException extends Exception
{
    /**
     * @param string $key
     * @param int $code
     * @param Throwable|null $previous
     * @return void
     */
    public function __construct(
        string $key,
        int $code = 0,
        Throwable $previous = null
    ) {
        $msg = sprintf('Entry with key "%s" is not found.', $key);
        parent::__construct($msg, $code, $previous);
    }
}
