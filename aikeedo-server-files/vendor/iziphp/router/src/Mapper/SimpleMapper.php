<?php

declare(strict_types=1);

namespace Easy\Router\Mapper;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Group;
use Easy\Router\Map;
use Easy\Router\MapperInterface;
use Easy\Router\MiddlewareCollection;
use Easy\Router\Priority;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Traversable;

/** @package Easy\Router\Mapper */
class SimpleMapper implements MapperInterface
{
    public MiddlewareCollection $middlewares;

    /** @var (Map|Group)[] $collection */
    private array $collection = [];

    /** @return void  */
    public function __construct()
    {
        $this->middlewares = new MiddlewareCollection($this);
    }

    /**
     * @param Map|Group $route
     * @return static
     */
    public function add(Map|Group $route): static
    {
        $this->collection[] = $route;
        return $this;
    }

    /**
     * @param string $method
     * @param string $path
     * @param RequestHandlerInterface|string $handle
     * @param int $priority
     * @param null|string $name
     * @param null|array<MiddlewareInterface|string> $middlewares
     * @return static
     * @SuppressWarnings(PHPMD.StaticAccess)
     */
    public function map(
        string $method,
        string $path,
        RequestHandlerInterface|string $handle,
        int $priority = Priority::NORMAL,
        ?string $name = null,
        ?array $middlewares = null
    ): static {
        $map = new Map();
        $map->method = RequestMethod::from($method);
        $map->path = $path;
        $map->handler = $handle;
        $map->name = $name;
        $map->middlewares->append(...$middlewares ?? []);
        $map->priority = $priority;

        $this->add($map);

        return $this;
    }

    /** @inheritDoc  */
    public function getIterator(): Traversable
    {
        foreach ($this->collection as $entity) {
            if ($entity instanceof Map) {
                yield $entity;
                continue;
            }

            if ($entity instanceof Group) {
                yield from $entity->getIterator();
                continue;
            }
        }
    }

    /**
     * @param string $name
     * @return Map|Group|null
     */
    public function getByName(string $name): Map|Group|null
    {
        foreach ($this->collection as $item) {
            if ($item->name == $name) {
                return $item;
            }

            if ($item instanceof Group) {
                $result = $item->getByName($name);

                if ($result) {
                    return $result;
                }
            }
        }

        return null;
    }
}
