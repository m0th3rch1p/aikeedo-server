<?php

declare(strict_types=1);

namespace User\Domain\Exceptions;

use Exception;
use Shared\Domain\ValueObjects\Id;
use Throwable;
use User\Domain\ValueObjects\Email;

/** @package User\Domain\Exceptions */
class UserNotFoundException extends Exception
{
    /**
     * @param Id|Email $id
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        private readonly Id|Email $id,
        int $code = 0,
        Throwable $previous = null
    ) {
        if ($id instanceof Email) {
            $message = sprintf(
                "User with email <%s> doesn't exists!",
                $id->value
            );
        } else {
            $message = sprintf(
                "User with id <%s> doesn't exists!",
                $id->getValue()
            );
        }

        parent::__construct($message, $code, $previous);
    }

    /** @return Id  */
    public function getId(): Id
    {
        return $this->id;
    }
}
