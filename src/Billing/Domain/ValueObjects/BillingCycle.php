<?php

declare(strict_types=1);

namespace Billing\Domain\ValueObjects;

use JsonSerializable;

/** @package Plan\Domain\ValueObjects */
enum BillingCycle: string implements JsonSerializable
{
    case ONE_TIME = 'one-time';
    case MONTHLY = 'monthly';
    case YEARLY = 'yearly';

    /** @return string  */
    public function jsonSerialize(): string
    {
        return $this->value;
    }
}
