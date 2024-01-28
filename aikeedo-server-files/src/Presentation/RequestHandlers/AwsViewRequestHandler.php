<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Middlewares\ViewMiddleware;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Infrastructure\SSO\IdentityProviderFactoryInterface;

#[Middleware(ViewMiddleware::class)]
#[Route(path: '/aws/register', method: RequestMethod::GET)]
class AwsViewRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // TODO: Implement handle() method.
        return new ViewResponse('/templates/aws/register.twig');
    }
}