<?php

declare(strict_types=1);

namespace Easy\Container\Exceptions;

use Exception;
use Psr\Container\ContainerExceptionInterface;

/** @package Easy\Container\Exceptions */
class ContainerException extends Exception implements
    ContainerExceptionInterface
{
}
