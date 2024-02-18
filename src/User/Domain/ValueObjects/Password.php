<?php

declare(strict_types=1);

namespace User\Domain\ValueObjects;

/** @package User\Domain\ValueObjects */
class Password
{
    public readonly null|string $value;

    public function __construct(?string $value = null)
    {
        $this->value = $value;
    }
}
