<?php

declare(strict_types=1);

namespace Preset\Domain\ValueObjects;

/** @package Preset\Domain\ValueObjects */
enum SortParameter: string
{
    case ID = 'id';
    case TITLE = 'title';
    case CREATED_AT = 'created_at';
    case UPDATED_AT = 'updated_at';
}
