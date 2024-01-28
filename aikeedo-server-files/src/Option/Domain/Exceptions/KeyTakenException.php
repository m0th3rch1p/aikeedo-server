<?php

declare(strict_types=1);

namespace Option\Domain\Exceptions;

use Exception;
use Option\Domain\ValueObjects\Key;
use Throwable;

/** @package Option\Domain\Exceptions */
class KeyTakenException extends Exception
{
    /**
     * @param Key $key 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return void 
     */
    public function __construct(
        private readonly Key $key,
        int $code = 0,
        Throwable $previous = null
    ) {
        parent::__construct(
            sprintf(
                "Option with key %s is already taken!",
                $key->value
            ),
            $code,
            $previous
        );
    }

    /** @return Key  */
    public function getKey(): Key
    {
        return $this->key;
    }
}
