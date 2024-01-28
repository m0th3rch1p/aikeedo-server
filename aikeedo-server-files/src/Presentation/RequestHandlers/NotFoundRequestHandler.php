<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Easy\Router\Priority;
use Presentation\Middlewares\ViewMiddleware;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Presentation\Response\ViewResponse;

/** @package General\Presentation\UI\RequestHandlers */
#[Middleware(ViewMiddleware::class)]
#[Route(path: '*', method: RequestMethod::GET, priority: Priority::LOW)]
class NotFoundRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{
    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     */
    public function handle(
        ServerRequestInterface $request
    ): ResponseInterface {
        return new ViewResponse(
            'templates/404.twig',
            status: StatusCode::NOT_FOUND
        );
    }
}
