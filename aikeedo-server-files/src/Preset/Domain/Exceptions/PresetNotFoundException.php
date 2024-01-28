<?php

declare(strict_types=1);

namespace Preset\Domain\Exceptions;

use Exception;
use Shared\Domain\ValueObjects\Id;
use Throwable;

/** @package Preset\Domain\Exceptions */
class PresetNotFoundException extends Exception
{
    /**
     * @param Id $id
     * @param int $code
     * @param null|Throwable $previous
     * @return void
     */
    public function __construct(
        private readonly Id $id,
        int $code = 0,
        Throwable $previous = null
    ) {
        parent::__construct(
            sprintf(
                "Preset with id <%s> doesn't exists!",
                $id->getValue()
            ),
            $code,
            $previous
        );
    }

    /** @return Id  */
    public function getId(): Id
    {
        return $this->id;
    }
}
