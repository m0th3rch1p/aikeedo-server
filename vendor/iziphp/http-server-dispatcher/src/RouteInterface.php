<?php

namespace Easy\Http\Server;

use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Interface RouteInterface
 *
 * Represents a route. A route is a combination of a request handler,
 * middleware stack and array of attributes. ServerRequestHandlerInterface
 * must be processed throught the middleware stack before it is handled by the
 * request handler.
 *
 * The request handler is responsible for generating a response. The middleware
 * stack is responsible for modifying the request before it is passed to the
 * request handler. The middleware stack is also responsible for modifying the
 * response before it is returned to the client.
 *
 * The middleware stack is executed in the order in which it is defined. The
 * request handler is executed last.
 *
 * @package Easy\Http\Server
 */
interface RouteInterface
{
    /** @return RequestHandlerInterface */
    public function getRequestHandler(): RequestHandlerInterface;

    /** @return array<MiddlewareInterface> */
    public function getMiddlewares(): array;

    /** @return array<RouteParamInterface> */
    public function getParams(): array;
}
