<?php

declare(strict_types=1);

namespace Presentation\Validation;

use Exception;
use Throwable;

/** @package Shared\Presentation\Validation */
class ValidationException extends Exception
{
    /**
     * @param string $message 
     * @param string $param 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return void 
     */
    public function __construct(
        string $message,
        private string $param,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    /** @return string  */
    public function getParam(): string
    {
        return $this->param;
    }
}
