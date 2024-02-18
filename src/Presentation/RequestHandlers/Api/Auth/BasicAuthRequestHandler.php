<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Auth;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\UnauthorizedException;
use Presentation\Middlewares\CaptchaMiddleware;
use Presentation\Response\Api\Auth\AuthResponse;
use Presentation\Response\EmptyResponse;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Application\Commands\BasicAuthCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\InvalidPasswordException;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\Status;

#[Middleware(CaptchaMiddleware::class)]
#[Route(path: '/basic', method: RequestMethod::POST)]
class BasicAuthRequestHandler extends AuthApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher,

        #[Inject('option.site.user_accounts_enabled')]
        private bool $userAccountsEnabled = true,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new BasicAuthCommand(
            email: $payload->email,
            password: $payload->password
        );

        try {
            /** @var UserEntity $user */
            $user = $this->dispatcher->dispatch($cmd);
        } catch (
            UserNotFoundException
            | InvalidPasswordException $th
        ) {
            return new EmptyResponse(StatusCode::UNAUTHORIZED);
        }

        if ($user->getStatus() !== Status::ACTIVE) {
            return new EmptyResponse(StatusCode::UNAUTHORIZED);
        }

        // If user accounts are disabled, only admins can login
        if (!$this->userAccountsEnabled && $user->getRole() !== Role::ADMIN) {
            throw new UnauthorizedException();
        }

        return new AuthResponse($user);
    }

    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'email' => 'required|email',
            'password' => 'required|string'
        ]);
    }
}
