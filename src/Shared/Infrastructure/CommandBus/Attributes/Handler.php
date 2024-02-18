<?php

declare(strict_types=1);

namespace Shared\Infrastructure\CommandBus\Attributes;

use Attribute;

/** @package Shared\Infrastructure\CommandBus\Attributes */
#[Attribute(Attribute::TARGET_CLASS)]
class Handler
{
    /**
     * @param class-string $className FQCN of the command/query handler
     * @return void
     */
    public function __construct(
        public string $className
    ) {
    }
}
