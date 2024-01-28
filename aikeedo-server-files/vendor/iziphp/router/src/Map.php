<?php

declare(strict_types=1);

namespace Easy\Router;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Mapper\SimpleMapper;
use Psr\Http\Server\RequestHandlerInterface;

/** @package Easy\Router */
class Map
{
    public RequestMethod $method = RequestMethod::GET;
    public null|Group|SimpleMapper $parent = null;
    public ?string $path = null;
    public RequestHandlerInterface|string $handler;
    public ?string $name = null;
    public MiddlewareCollection $middlewares;
    public int $priority = Priority::NORMAL;

    /** @return void  */
    public function __construct()
    {
        $this->middlewares = new MiddlewareCollection($this);
    }

    /** @return string  */
    public function getPath(): string
    {
        if ($this->parent instanceof Group) {
            return $this->parent->getPrefix() . $this->getSanitizePath();
        }

        return $this->getSanitizePath();
    }

    /** @return string */
    private function getSanitizePath(): string
    {
        $path = preg_replace('/\/+/', '/', $this->path ?: '');
        $path = trim($path ?: '', '/');
        $path = '/' . $path;

        return $path;
    }
}
