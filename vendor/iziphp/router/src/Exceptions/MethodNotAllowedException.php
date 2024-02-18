<?php

declare(strict_types=1);

namespace Easy\Router\Exceptions;

use Easy\Http\Server\Exceptions\MethodNotAllowedExceptionInterface;

/** @package Easy\Router\Exceptions */
class MethodNotAllowedException extends Exception implements
    MethodNotAllowedExceptionInterface
{
}
