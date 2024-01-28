<?php

namespace Easy\Http\Server;

use Easy\Http\Server\Exceptions\DispatcherExceptionInterface;
use Easy\Http\Server\Exceptions\MethodNotAllowedExceptionInterface;
use Easy\Http\Server\Exceptions\RouteNotFoundExceptionInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Interface DispatcherInterface
 *
 * Dispatches a server request to a route
 *
 * @package Easy\Http\Server
 */
interface DispatcherInterface
{
    /**
     * Dispatches a server request to a route
     *
     * @param ServerRequestInterface $request
     * @return RouteInterface
     * @throws DispatcherExceptionInterface
     * @throws MethodNotAllowedExceptionInterface
     * @throws RouteNotFoundExceptionInterface
     */
    public function dispatch(ServerRequestInterface $request): RouteInterface;
}
