<?php

namespace Easy\Menv\Exceptions;

use Throwable;

/** @package Easy\Menv\Exceptions */
class InvalidEntryValueException extends Exception
{
    /** @var mixed $value */
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

        if (is_string($value)) {
            $msg = sprintf('<%s> is not a valid entry value.', $value);
        } else {
            $msg = 'Entry value is not valid.';
        }

        parent::__construct($msg, $code, $previous);
    }

    /** @return mixed  */
    public function getValue()
    {
        return $this->value;
    }
}
