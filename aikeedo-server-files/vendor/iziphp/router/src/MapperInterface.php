<?php

declare(strict_types=1);

namespace Easy\Router;

use IteratorAggregate;
use Traversable;

/**
 * @package Easy\Router
 * @extends IteratorAggregate<Map>
 */
interface MapperInterface extends IteratorAggregate
{
    /** @return Traversable<Map>  */
    public function getIterator(): Traversable;
}
