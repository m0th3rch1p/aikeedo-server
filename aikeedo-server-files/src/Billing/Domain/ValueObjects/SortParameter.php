<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

/**
 * @package Plan\Domain\ValueObjects
 */
enum SortParameter: string
{
    case ID = 'id';
    case CREATED_AT = 'created_at';
    case UPDATED_AT = 'updated_at';
    case PRICE = 'price';
    case SUPERIORITY = 'superiority';
}
