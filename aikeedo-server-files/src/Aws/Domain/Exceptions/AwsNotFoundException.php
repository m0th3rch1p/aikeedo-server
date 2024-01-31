<?php

declare(strict_types=1);

namespace Aws\Domain\Exceptions;

use Exception;
use Shared\Domain\ValueObjects\Id;
use Throwable;

/**
 * @package Aws\Domain\Exceptions
 */
class AwsNotFoundException extends Exception
{
    /**
     * @param Id $id
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        public readonly string $id,
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf(
                "Aws with id <%s> doesn't exists!",
                $id->getValue()
            ),
            $code,
            $previous
        );
    }

    /**
     * @return Id
     */
    public function getId(): Id
    {
        return $this->id;
    }
}
