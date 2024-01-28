<?php

declare(strict_types=1);

namespace Document\Domain\ValueObjects;

/**
 * @package Document\Domain\ValueObjects
 */
enum SortParameter: string
{
    case ID = 'id';
    case CREATED_AT = 'created_at';
    case UPDATED_AT = 'updated_at';
    case TITLE = 'title';
}
