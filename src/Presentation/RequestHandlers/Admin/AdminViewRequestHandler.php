<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** @package Presentation\RequestHandlers\Admin */
#[Route(path: '/[categories|presets|users|plans|templates:view]', method: RequestMethod::GET)]
class AdminViewRequestHandler extends AbstractAdminViewRequestHandler implements
    RequestHandlerInterface
{
    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $view = $request->getAttribute('view');

        $template = $view;
        if ($view == 'templates') {
            $template = 'presets';
        }

        return new ViewResponse(
            '/templates/admin/' . $template . '.twig'
        );
    }
}
