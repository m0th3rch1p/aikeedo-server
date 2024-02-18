<?php

/**
 * Dispatcher::isPathMatched() and Dispatcher::compilePath() methods are
 * inspired by AltoRouter
 *
 * @see https://altorouter.com
 */

declare(strict_types=1);

namespace Easy\Router;

use Easy\Http\Server\DispatcherInterface;
use Easy\Http\Server\RouteInterface;
use Easy\Http\Server\RouteParamInterface;
use Easy\Router\Exceptions\MethodNotAllowedException;
use Easy\Router\Exceptions\RouteNotFoundException;
use Iterator;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use SplPriorityQueue;

/**
 * @SuppressWarnings(PHPMD.CouplingBetweenObjects)
 * @package Easy\Router
 */
class Dispatcher implements DispatcherInterface
{
    /** @var array<MapperInterface> $mappers */
    private array $mappers = [];

    /** @var array<string> Array of the match types  */
    protected array $matchTypes = [
        'i'  => '[0-9]++', // Integer
        'a'  => '[0-9A-Za-z]++', // Alphanumeric
        'h'  => '[0-9A-Fa-f]++', // Hexadecimal
        's'  => '[0-9A-Za-z\-]++', // url slug
        'uuid' => '[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}',
        '*'  => '.+?', //
        '**' => '.++',
        ''   => '[^/\.]++'
    ];

    /** @var array<string,mixed> */
    private array $params = [];

    /**
     * @param ContainerInterface $container
     * @return void
     */
    public function __construct(
        private ContainerInterface $container
    ) {
    }

    /**
     * @param string $name 
     * @param string $regex 
     * @return Dispatcher 
     */
    public function addMatchType(string $name, string $regex): self
    {
        $this->matchTypes[$name] = $regex;
        return $this;
    }

    /**
     * @param MapperInterface $mapper
     * @return Dispatcher
     */
    public function pushMapper(MapperInterface $mapper): self
    {
        $this->mappers[] = $mapper;
        return $this;
    }


    /** @inheritDoc */
    public function dispatch(ServerRequestInterface $request): RouteInterface
    {
        $map = $this->getMatchedMap(
            $request
        );

        return $this->generateRoute($map);
    }

    /**
     * @param Map $map
     * @return RouteInterface
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    private function generateRoute(Map $map): RouteInterface
    {
        $handler = $map->handler;
        if (is_string($handler)) {
            $handler = $this->container->get($handler);
            /** @var RequestHandlerInterface $handler */
        }

        $params = [];
        foreach ($this->params as $key => $value) {
            if (!is_numeric($key)) {
                $params[] = new Param($key, $value);
            }
        }
        /** @var array<RouteParamInterface> $params */

        $middlewares = [];
        foreach ($map->middlewares as $middleware) {
            if (is_string($middleware)) {
                $middleware = $this->container->get($middleware);
            }

            $middlewares[] = $middleware;
        }
        /** @var array<MiddlewareInterface> $middlewares */

        return new Route($handler, $middlewares, $params);
    }

    /**
     * @param ServerRequestInterface $request
     * @return Map
     * @throws MethodNotAllowedException
     * @throws RouteNotFoundException
     */
    private function getMatchedMap(
        ServerRequestInterface $request
    ): Map {
        $uri = $request->getUri();
        $requestPath = '/' . trim($uri->getPath(), '/') . '/';
        $allowedMethods = [];

        $maps = $this->getSortedMaps();

        foreach ($maps as $map) {
            if ($this->isPathMatched($map, $requestPath)) {
                if ($this->isMethodMatched($map, $request->getMethod())) {
                    return $map;
                }

                $allowedMethods[] = $map->method;
            }
        }

        if ($allowedMethods) {
            throw new MethodNotAllowedException();
        }

        throw new RouteNotFoundException($request);
    }

    /**
     * @return Iterator<Map>
     */
    private function getSortedMaps(): Iterator
    {
        /** @var SplPriorityQueue<int,Map> */
        $queue = new SplPriorityQueue();
        foreach ($this->mappers as $mapper) {
            foreach ($mapper as $map) {
                $queue->insert($map, $map->priority);
            }
        }

        return $queue;
    }

    /**
     * @param Map $map
     * @param string $method
     * @return bool
     */
    private function isMethodMatched(Map $map, string $method): bool
    {
        return $method === $map->method->value;
    }

    /**
     * @param Map $map
     * @param string $requestPath
     * @return bool
     * @SuppressWarnings(PHPMD.CyclomaticComplexity)
     * @SuppressWarnings(PHPMD.NPathComplexity)
     */
    private function isPathMatched(Map $map, string $requestPath): bool
    {
        $this->params = [];

        // Last character of the request url
        $lastChar = $requestPath ? $requestPath[strlen($requestPath) - 1] : '';
        $path = $map->getPath() . '[/]?';

        if ($map->getPath() === '/*') {
            // * wildcard (matches all)
            return true;
        }

        if (isset($path[0]) && $path[0] === '@') {
            // @ regex delimiter
            $pattern = '`' . substr($path, 1) . '`u';

            if (preg_match($pattern, $requestPath, $this->params) === 1) {
                return true;
            }
        }

        $position = strpos($path, '[');
        if ($position === false && strcmp($requestPath, $path) === 0) {
            // No params in url, do string comparison
            return true;
        }

        // Compare longest non-param string with url before moving on to
        // regex. Check if last character before param is a slash,
        // because it could be optional if param is optional too
        /** @var int $position */
        if (
            strncmp($requestPath, $path, $position) !== 0
            && ($lastChar === '/' || $path[$position - 1] !== '/')
        ) {
            return false;
        }

        $regex = $this->compilePath($path);
        if (preg_match($regex, $requestPath, $this->params) === 1) {
            return true;
        }

        return false;
    }

    /**
     * Compile the regex for a given route path (EXPENSIVE)
     *
     * @param string $path
     * @return string
     */
    protected function compilePath(string $path): string
    {
        $pattern = '`(/|\.|)\[([^:\]]*+)(?::([^:\]]*+))?\](\?|)`';
        if (preg_match_all($pattern, $path, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                list($block, $pre, $type, $param, $optional) = $match;

                if (isset($this->matchTypes[$type])) {
                    $type = $this->matchTypes[$type];
                }

                if ($pre === '.') {
                    $pre = '\.';
                }

                $optional = $optional !== '' ? '?' : null;

                //Older versions of PCRE require the 'P' in (?P<named>)
                $pattern = '(?:'
                    . ($pre !== '' ? $pre : null)
                    . '('
                    . ($param !== '' ? "?P<$param>" : null)
                    . $type
                    . ')'
                    . $optional
                    . ')'
                    . $optional;

                $path = str_replace($block, $pattern, $path);
            }
        }

        return "`^$path$`u";
    }
}
