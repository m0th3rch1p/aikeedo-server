<?php

declare(strict_types=1);

namespace Option\Domain\Exceptions;

use Exception;
use Shared\Domain\ValueObjects\Id;
use Throwable;

/**
 * @package Option\Domain\Exceptions
 */
class OptionNotFoundException extends Exception
{
    /**
     * @param Id $id
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        public readonly Id $id,
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf(
                "Option with id <%s> doesn't exists!",
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
