<?php

declare(strict_types=1);

namespace Easy\Router;

use Easy\Http\Server\RouteInterface;
use Easy\Http\Server\RouteParamInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** @package Easy\Router */
class Route implements RouteInterface
{
    /** @var array<MiddlewareInterface> */
    private array $middlewares = [];

    /** @var array<RouteParamInterface> */
    private array $params = [];

    /**
     * @param RequestHandlerInterface $requestHandler
     * @param array<MiddlewareInterface> $middlewares
     * @param array<RouteParamInterface> $params
     * @return void
     */
    public function __construct(
        private RequestHandlerInterface $requestHandler,
        array $middlewares = [],
        array $params = []
    ) {
        $this->setMiddlewares(...$middlewares);
        $this->setParams(...$params);
    }

    /** @inheritDoc */
    public function getRequestHandler(): RequestHandlerInterface
    {
        return $this->requestHandler;
    }

    /** @inheritDoc */
    public function getMiddlewares(): array
    {
        return $this->middlewares;
    }

    /** @inheritDoc */
    public function getParams(): array
    {
        return $this->params;
    }

    /**
     * @param MiddlewareInterface ...$middlewares
     * @return Route
     */
    private function setMiddlewares(MiddlewareInterface ...$middlewares): Route
    {
        $this->middlewares = $middlewares;
        return $this;
    }

    /**
     * @param RouteParamInterface ...$params
     * @return Route
     */
    private function setParams(RouteParamInterface ...$params): Route
    {
        $this->params = $params;
        return $this;
    }
}
