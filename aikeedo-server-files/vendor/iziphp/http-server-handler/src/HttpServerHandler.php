<?php

declare(strict_types=1);

namespace Easy\HttpServerHandler;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** @package Easy\HttpServerHandler */
class HttpServerHandler implements RequestHandlerInterface
{
    /** @var array<MiddlewareInterface> $queue */
    private array $queue;

    /**
     * @param RequestHandlerInterface $handler
     * @param array<MiddlewareInterface> ...$queue
     * @return void
     */
    public function __construct(
        private RequestHandlerInterface $handler,
        MiddlewareInterface ...$queue
    ) {
        $this->queue = $queue;
    }

    /**
     * @inheritDoc
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $entry = $this->queue[0] ?? null;

        if ($entry && $entry instanceof MiddlewareInterface) {
            $handler = clone $this;
            $handler->queue = array_slice($this->queue, 1);

            return $entry->process($request, $handler);
        }

        return $this->handler->handle($request);
    }
}
