<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Middlewares\ViewMiddleware;
use Presentation\Response\RedirectResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Application\Commands\VerifyEmailCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\InvalidTokenException;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\ValueObjects\Role;

#[Middleware(ViewMiddleware::class)]
#[Route(
    path: '/verification/email/[uuid:id]/[*:token]',
    method: RequestMethod::GET
)]
class VerifyEmailRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);
        if (
            $user
            && (
                $user->isEmailVerified()->value
                || $user->getId()->getValue()->toString() !== $request->getAttribute('id')
            )
        ) {
            return new RedirectResponse(
                $user->getRole() == Role::ADMIN ? '/admin' : '/app'
            );
        }

        $cmd = new VerifyEmailCommand(
            $request->getAttribute('id'),
            $request->getAttribute('token')
        );

        try {
            /** @var UserEntity */
            $user = $this->dispatcher->dispatch($cmd);
        } catch (UserNotFoundException | InvalidTokenException) {
            return new RedirectResponse('/login');
        }

        return new RedirectResponse('/app/account');
    }
}
