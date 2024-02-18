<?php

declare(strict_types=1);

namespace Billing\Domain\Exceptions;

use Billing\Domain\ValueObjects\Title;
use Exception;
use Shared\Domain\ValueObjects\Id;
use Throwable;

/**
 * @package Plan\Domain\Exceptions
 */
class PlanNotFoundException extends Exception
{
    /**
     * @param Id $id
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        public readonly Id | Title $id,
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf(
                "Plan with id <%s> doesn't exists!",
                $id instanceof Id ? $id->getValue() : $id->value
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
