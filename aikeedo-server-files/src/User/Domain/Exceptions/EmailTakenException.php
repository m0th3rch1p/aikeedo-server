<?php

declare(strict_types=1);

namespace User\Domain\Exceptions;

use Exception;
use Throwable;
use User\Domain\ValueObjects\Email;

/** @package User\Domain\Exceptions */
class EmailTakenException extends Exception
{
    /**
     * @param Email $email
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        private readonly Email $email,
        int $code = 0,
        Throwable $previous = null
    ) {
        parent::__construct(
            sprintf(
                "Email %s is already taken!",
                $email->value
            ),
            $code,
            $previous
        );
    }

    /** @return Email  */
    public function getEmail(): Email
    {
        return $this->email;
    }
}
