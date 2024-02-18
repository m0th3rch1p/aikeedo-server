<?php

declare(strict_types=1);

namespace Easy\Emitter\Exceptions;

use Easy\Http\ResponseEmitter\Exceptions\PreviousOutputExceptionInterface;

/** @package Easy\Emitter\Exceptions */
class PreviousOutputException extends EmitterException implements
    PreviousOutputExceptionInterface
{
}
