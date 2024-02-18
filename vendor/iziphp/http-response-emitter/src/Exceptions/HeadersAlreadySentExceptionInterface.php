<?php

declare(strict_types=1);

namespace Easy\Http\ResponseEmitter\Exceptions;

/** @package Easy\Http\ResponseEmitter\Exceptions */
interface HeadersAlreadySentExceptionInterface extends EmitterExceptionInterface
{
    /**
     * Get PHP source file name where output started in.
     *
     * @return  string
     */
    public function getHeadersSentFile(): string;

    /**
     * Get line number in the PHP source file name where output started in
     *
     * @return  int
     */
    public function getHeadersSentLine(): int;
}
