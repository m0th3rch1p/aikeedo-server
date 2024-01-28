<?php

declare(strict_types=1);

namespace Easy\Emitter\Exceptions;

use Easy\Http\ResponseEmitter\Exceptions\HeadersAlreadySentExceptionInterface;
use Throwable;

use function sprintf;

/** @package Easy\Emitter\Exceptions */
class HeadersAlreadySentException extends EmitterException implements
    HeadersAlreadySentExceptionInterface
{
    /**
     * @param string $headersSentFile PHP source file name where output started in
     * @param int $headersSentLine Line number in the PHP source file name where
     * output started in
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        private string $headersSentFile,
        private int $headersSentLine,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        $msg = sprintf('Headers already sent in file %s on line %s.', $headersSentFile, $headersSentLine);
        parent::__construct($msg, $code, $previous);
    }

    /**
     * @inheritDoc
     */
    public function getHeadersSentFile(): string
    {
        return $this->headersSentFile;
    }

    /**
     * @inheritDoc
     */
    public function getHeadersSentLine(): int
    {
        return $this->headersSentLine;
    }
}
