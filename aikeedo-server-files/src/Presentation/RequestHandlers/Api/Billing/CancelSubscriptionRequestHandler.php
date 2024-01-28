<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Billing;

use Billing\Application\Commands\CancelSubscriptionCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Entities\UserEntity;

#[Route(path: '/subscription', method: RequestMethod::DELETE)]
class CancelSubscriptionRequestHandler extends BillingApi implements
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

        $cmd = new CancelSubscriptionCommand($user);
        $this->dispatcher->dispatch($cmd);

        return new EmptyResponse();
    }
}
