<?php

declare(strict_types=1);

namespace Easy\Container\Exceptions;

use Exception;
use Psr\Container\NotFoundExceptionInterface;
use Throwable;

/** @package Easy\Container\Exceptions */
class NotFoundException extends Exception implements NotFoundExceptionInterface
{
    /**
     * @param string $abstract
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        string $abstract,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        $message = "An entry with an id of {$abstract} is not registered";
        parent::__construct($message, $code, $previous);
    }
}
