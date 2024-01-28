<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Middlewares\ViewMiddleware;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Domain\Entities\UserEntity;
use User\Domain\ValueObjects\Role;
use User\Infrastructure\SSO\IdentityProviderFactoryInterface;

/** @package Presentation\RequestHandlers\Auth */
#[Middleware(ViewMiddleware::class)]
#[Route(path: '/login', method: RequestMethod::GET)]
class LoginViewRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{
    public function __construct(
        private IdentityProviderFactoryInterface $factory
    ) {
    }

    /**
     * @param ServerRequestInterface $request
     * @return ResponseInterface
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $user = $request->getAttribute(UserEntity::class);
        if ($user) {
            return new RedirectResponse(
                $user->getRole() == Role::ADMIN ? '/admin' : '/app'
            );
        }

        $data = [
            'demo_account_email' => env('DEMO_ACCOUNT_EMAIL'),
            'demo_account_password' => env('DEMO_ACCOUNT_PASSWORD'),
            'identity_providers' => $this->factory->listAll(),
        ];

        return new ViewResponse(
            '/templates/auth/login.twig',
            $data
        );
    }
}
