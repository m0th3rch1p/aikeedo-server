<?php

namespace Easy\Router;

use IteratorAggregate;
use Easy\Router\Mapper\SimpleMapper;
use Psr\Http\Server\MiddlewareInterface;
use Traversable;

/**
 * @package Easy\Router
 * @implements IteratorAggregate<MiddlewareInterface|string>
 */
class MiddlewareCollection implements IteratorAggregate
{
    /** @var array<MiddlewareInterface|string> */
    private array $collection = [];

    /**
     * @param null|Map|SimpleMapper $owner
     * @return void
     */
    public function __construct(
        private null|Map|Group|SimpleMapper $owner = null
    ) {
    }

    /** @return Traversable<MiddlewareInterface|string>  */
    public function getIterator(): Traversable
    {
        if ($this->owner) {
            /** @var null|Group|SimpleMapper $parent */
            $parent = $this->owner->parent ?? null;

            if ($parent) {
                yield from $parent->middlewares;
            }
        }

        yield from $this->collection;
    }

    /**
     * @param MiddlewareInterface|string ...$middlewares
     * @return static
     */
    public function append(
        MiddlewareInterface|string ...$middlewares
    ): MiddlewareCollection {
        $this->collection = array_merge($this->collection, $middlewares);
        return $this;
    }

    /**
     * @param MiddlewareInterface|string ...$middlewares
     * @return static
     */
    public function prepend(
        MiddlewareInterface|string ...$middlewares
    ): MiddlewareCollection {
        $this->collection = array_merge($middlewares, $this->collection);
        return $this;
    }

    /** @return MiddlewareCollection  */
    public function clear(): MiddlewareCollection
    {
        $this->collection = [];
        return $this;
    }
}
