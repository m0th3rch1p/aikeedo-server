<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** @package Presentation\RequestHandlers */
#[Route(path: '/presets', method: RequestMethod::GET)]
class ListPresetsRequestHandler extends AppView implements
    RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return new ViewResponse(
            '/templates/app/presets.twig',
        );
    }
}
