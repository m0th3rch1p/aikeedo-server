<?php

declare(strict_types=1);

namespace Category\Domain\ValueObjects;

/** @package Category\Domain\ValueObjects */
enum SortParameter: string
{
    case ID = 'id';
    case CREATED_AT = 'created_at';
    case TITLE = 'title';
    case UPDATED_AT = 'updated_at';
}
