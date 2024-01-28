<?php

declare(strict_types=1);

namespace Easy\Container\Tests;

use Easy\Container\Attributes\Inject;

/** @package Easy\Container\Tests */
class Bar
{
    public function __construct(
        public readonly Foo $foo,

        #[Inject('injected_primitive_value')]
        public readonly string $primitive
    ) {
    }
}
