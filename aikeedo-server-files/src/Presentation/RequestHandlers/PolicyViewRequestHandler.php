<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Middlewares\ViewMiddleware;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;

#[Middleware(ViewMiddleware::class)]
#[Route(path: '/policies/[privacy|refund|terms:policy]', method: RequestMethod::GET)]
class PolicyViewRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $policy = $request->getAttribute('policy');

        return new ViewResponse(
            'templates/policy.twig',
            [
                'policy' => $policy
            ]
        );
    }
}
