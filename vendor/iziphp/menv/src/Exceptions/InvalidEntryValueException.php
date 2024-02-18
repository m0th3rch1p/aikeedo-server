<?php

declare(strict_types=1);

namespace Easy\Menv\Exceptions;

use Throwable;

/** @package Easy\Menv\Exceptions */
class InvalidEntryValueException extends Exception
{
    /** @var mixed */
    private $value;

    /**
     * @param mixed $value
     * @param int $code
     * @param Throwable|null $previous
     * @return void
     */
    public function __construct(
        $value,
        int $code = 0,
        Throwable $previous = null
    ) {
        $this->value = $value;

        $msg = 'Entry value is not valid.';

        if (is_string($value)) {
            $msg = sprintf('<%s> is not a valid entry value.', $value);
        }

        parent::__construct($msg, $code, $previous);
    }

    /** @return mixed  */
    public function getValue()
    {
        return $this->value;
    }
}
