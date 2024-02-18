<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Cookies\UserCookie;
use Presentation\Response\RedirectResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;

#[Route(path: '/logout', method: RequestMethod::GET)]
class LogoutRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $cookie = UserCookie::createFromRequest($request);

        $resp = new RedirectResponse('/');

        if ($cookie) {
            $resp = $resp
                ->withAddedHeader('Set-Cookie', $cookie->toHeaderValue(true));
        }

        return $resp;
    }
}
