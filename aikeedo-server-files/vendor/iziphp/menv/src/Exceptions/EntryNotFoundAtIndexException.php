<?php

declare(strict_types=1);

namespace Easy\Menv\Exceptions;

use Throwable;

/** @package Easy\Menv\Exceptions */
class EntryNotFoundAtIndexException extends Exception
{
    /**
     * @param int $index
     * @param int $code
     * @param Throwable|null $previous
     * @return void
     */
    public function __construct(
        int $index,
        int $code = 0,
        Throwable $previous = null
    ) {
        $msg = sprintf('Entry is not found at index "%s".', $index);
        parent::__construct($msg, $code, $previous);
    }
}
