<?php

declare(strict_types=1);

namespace Ai\Domain\ValueObjects;

use JsonSerializable;

enum Accent: string implements JsonSerializable
{
    case UNKNOWN = '';

    case AMERICAN = 'american';
    case AMERICAN_IRISH = 'american-iris';
    case AMERICAN_SOUTHERN = 'american-southern';
    case AUSTRALIAN = 'australian';
    case BRITISH = 'british';
    case BRITISH_ESSEX = 'british-essex';
    case ENGLISH_SWEDISH = 'english-swedish';
    case ENGLISH_ITALIAN = 'english-italian';
    case INDIAN = 'indian';
    case IRISH = 'irish';

    public function jsonSerialize(): string
    {
        return $this->value;
    }
}
