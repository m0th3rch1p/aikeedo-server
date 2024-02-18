<?php

namespace Easy\Router\Attributes;

use Attribute;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Priority;

/** @package Easy\Router\Attributes */
#[Attribute(Attribute::TARGET_CLASS | Attribute::IS_REPEATABLE)]
class Route
{
    /**
     * @param string $path
     * @param RequestMethod $method
     * @param int $priority
     * @return void
     */
    public function __construct(
        public readonly string $path,
        public readonly RequestMethod $method = RequestMethod::GET,
        public readonly int $priority = Priority::NORMAL
    ) {
    }
}
