<?php

namespace Easy\Container\Attributes;

use Attribute;

/** @package Easy\Container\Attributes */
#[Attribute(Attribute::TARGET_PARAMETER)]
class Inject
{
    public function __construct(public mixed $abstract)
    {
    }
}
