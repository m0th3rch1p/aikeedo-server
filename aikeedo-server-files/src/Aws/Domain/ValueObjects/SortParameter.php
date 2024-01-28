<?php

declare(strict_types=1);

namespace Aws\Domain\ValueObjects;

/**
 * @package Aws\Domain\ValueObjects
 */
enum SortParameter: string
{
    case ID = 'id';
    case CREATED_AT = 'created_at';
    case UPDATED_AT = 'updated_at';
}
