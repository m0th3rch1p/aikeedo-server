<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Auth;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Response\Api\Auth\AuthResponse;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\NotFoundException;
use Presentation\Middlewares\CaptchaMiddleware;
use Presentation\Response\JsonResponse;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\CreateUserCommand;
use User\Domain\Exceptions\EmailTakenException;

#[Middleware(CaptchaMiddleware::class)]
#[Route(path: '/signup', method: RequestMethod::POST)]
class SignupRequestHandler extends AuthApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher,

        #[Inject('option.site.user_accounts_enabled')]
        private bool $userAccountsEnabled = true,

        #[Inject('option.site.user_signup_enabled')]
        private bool $userSignupEnabled = true,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new CreateUserCommand(
            $payload->email,
            $payload->first_name,
            $payload->last_name
        );

        $cmd->setPassword($payload->password);

        try {
            $user = $this->dispatcher->dispatch($cmd);
        } catch (EmailTakenException $th) {
            throw new HttpException(
                message: $th->getMessage(),
                param: 'email'
            );
        }
        return new AuthResponse($user);
    }

    private function validateRequest(ServerRequestInterface $req): void
    {
        if (!$this->userAccountsEnabled || !$this->userSignupEnabled) {
            throw new NotFoundException();
        }

        $this->validator->validateRequest($req, [
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'email' => 'required|email',
            'password' => 'required|string'
        ]);
    }
}
