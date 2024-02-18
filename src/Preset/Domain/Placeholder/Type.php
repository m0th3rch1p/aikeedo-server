<?php

declare(strict_types=1);

namespace Preset\Domain\Placeholder;

/** @package Preset\Domain\ValueObjects */
enum Type: string
{
    case TEXT = 'text';
    case ENUM = 'enum';
}
