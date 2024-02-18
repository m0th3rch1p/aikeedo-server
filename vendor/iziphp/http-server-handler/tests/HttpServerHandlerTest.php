<?php

use PHPUnit\Framework\TestCase;
use Easy\HttpServerHandler\HttpServerHandler;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class HttpServerHandlerTest extends TestCase
{
    public function testHandleWithNoMiddlewares()
    {
        $request = $this->createMock(ServerRequestInterface::class);

        $handler = $this->createMock(RequestHandlerInterface::class);
        $handler->expects($this->once())
            ->method('handle')
            ->with($request)
            ->willReturn($this->createMock(ResponseInterface::class));

        $httpServerHandler = new HttpServerHandler($handler);

        $response = $httpServerHandler->handle($request);

        $this->assertInstanceOf(ResponseInterface::class, $response);
    }

    public function testHandleWithOneMiddleware()
    {
        $request = $this->createMock(ServerRequestInterface::class);
        $response = $this->createMock(ResponseInterface::class);

        $middleware = $this->createMock(MiddlewareInterface::class);
        $middleware->expects($this->once())
            ->method('process')
            ->with($request, $this->isInstanceOf(HttpServerHandler::class))
            ->willReturn($response);

        $handler = $this->createMock(RequestHandlerInterface::class);

        $httpServerHandler = new HttpServerHandler($handler, $middleware);

        $this->assertSame($response, $httpServerHandler->handle($request));
    }
}
