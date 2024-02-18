<?php

declare(strict_types=1);

namespace Easy\Emitter\Exceptions;

use Easy\Http\ResponseEmitter\Exceptions\EmitterExceptionInterface;
use Exception;

/** @package Easy\Emitter\Exceptions */
class EmitterException extends Exception implements EmitterExceptionInterface
{
}
