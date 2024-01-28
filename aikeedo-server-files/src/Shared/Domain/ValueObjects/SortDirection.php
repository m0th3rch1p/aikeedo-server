<?php

declare(strict_types=1);

namespace Shared\Domain\ValueObjects;

/** @package Shared\Domain\ValueObjects */
enum SortDirection: string
{
    case ASC = 'ASC';
    case DESC = 'DESC';

    /** @return SortDirection  */
    public function getOpposite(): SortDirection
    {
        // phpcs:disable
        return match ($this) {
            self::ASC => self::DESC,
            self::DESC => self::ASC,
        };
        // phpcs:disable
    }
}
