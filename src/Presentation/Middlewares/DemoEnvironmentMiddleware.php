<?php

declare(strict_types=1);

namespace Presentation\Middlewares;

use Presentation\Exceptions\UnauthorizedException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class DemoEnvironmentMiddleware implements MiddlewareInterface
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        if (env('ENVIRONMENT') == 'demo') {
            throw new UnauthorizedException('This feature is disabled in demo environment.');
        }

        return $handler->handle($request);
    }
}
