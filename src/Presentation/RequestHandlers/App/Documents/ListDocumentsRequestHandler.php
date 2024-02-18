<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App\Documents;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;

#[Route(path: '/', method: RequestMethod::GET)]
class ListDocumentsRequestHandler extends DocumentsView implements
    RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return new ViewResponse(
            '/templates/app/documents/list.twig'
        );
    }
}
