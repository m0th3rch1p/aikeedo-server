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
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\ReadUserCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\InvalidTokenException;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\ValueObjects\RecoveryToken;
use User\Domain\ValueObjects\Role;

/** 
 * Class PasswordResetRequestHandler
 *
 * A class representing an API route for handling user requests to reset their 
 * passwords.
 *
 * @package Presentation\RequestHandlers\Auth 
 */
#[Middleware(ViewMiddleware::class)]
#[Route(path: '/recovery/[uuid:id]/[*:token]', method: RequestMethod::GET)]
class PasswordResetRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{
    /**
     * Constructs an instance of this class, initializing the dispatcher.
     *
     * @param Dispatcher $dispatcher The dispatcher used to dispatch CommandBus 
     * commands.
     */
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * Handles incoming server requests for password recovery.
     *
     * If user is already recovered, it will redirect accordingly to its role.
     * Otherwise, it tries to read user and validate the recovery token. If user 
     * is not found or recovery token is invalid, redirect to login page. Upon 
     * successful validation, it will render the password reset view.
     *
     * @param ServerRequestInterface $request The incoming server request
     * @return ResponseInterface Returns a view response to display the password 
     * reset form, or redirects in case of errors or if user is already logged 
     * in.
     * @throws NoHandlerFoundException Thrown if no appropriate handler is found 
     * for the dispatched command
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $user = $request->getAttribute(UserEntity::class);
        if ($user) {
            return new RedirectResponse(
                $user->getRole() == Role::ADMIN ? '/admin' : '/app'
            );
        }

        $id = $request->getAttribute('id');
        $token = new RecoveryToken($request->getAttribute('token'));

        $cmd = new ReadUserCommand($id);

        try {
            /** @var UserEntity */
            $user = $this->dispatcher->dispatch($cmd);
            $user->validateRecoveryToken($token);
        } catch (UserNotFoundException | InvalidTokenException) {
            return new RedirectResponse('/login');
        }

        $data = [
            'id' => $id,
            'token' => $token->value,
        ];

        return new ViewResponse(
            '/templates/auth/reset.twig',
            $data
        );
    }
}
