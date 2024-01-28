<?php

declare(strict_types=1);

namespace Easy\Router\Exceptions;

use Easy\Http\Server\Exceptions\DispatcherExceptionInterface;

/** @package Easy\Router\Exceptions */
class Exception extends \Exception implements DispatcherExceptionInterface
{
}
