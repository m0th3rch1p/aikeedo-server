<?php

namespace Easy\Router\Attributes;

use Attribute;
use Psr\Http\Server\MiddlewareInterface;

/** @package Easy\Router\Attributes */
#[Attribute(Attribute::TARGET_CLASS | Attribute::IS_REPEATABLE)]
class Middleware
{
    /**
     * @param class-string<MiddlewareInterface> $middleware
     * @return void
     */
    public function __construct(
        public readonly string $middleware
    ) {
    }
}
