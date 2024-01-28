<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Account;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Application\Commands\RequestEmailVerificationCommand;
use User\Domain\Entities\UserEntity;

#[Route(path: '/verification', method: RequestMethod::POST)]
class SendVerificationEmailRequestHandler extends AccountApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $cmd = new RequestEmailVerificationCommand($user);
        $this->dispatcher->dispatch($cmd);

        return new EmptyResponse();
    }
}
