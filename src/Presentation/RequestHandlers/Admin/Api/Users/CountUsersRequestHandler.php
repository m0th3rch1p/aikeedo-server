<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Users;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\JsonResponse;
use Presentation\Resources\CountResource;
use User\Application\Commands\CountUsersCommand;

/** @package Presentation\RequestHandlers\Admin\Api\Users */
#[Route(path: '/count', method: RequestMethod::GET)]
class CountUsersRequestHandler extends UserApi implements
    RequestHandlerInterface
{
    /**
     * @param Dispatcher $dispatcher
     * @return void
     */
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request
     * @return ResponseInterface
     * @throws NoHandlerFoundException
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $cmd = new CountUsersCommand();

        if ($status = $request->getQueryParams()['status'] ?? null) {
            $cmd->setStatus((int) $status);
        }

        if ($role = $request->getQueryParams()['role'] ?? null) {
            $cmd->setRole((int) $role);
        }

        if ($query = $request->getQueryParams()['query'] ?? null) {
            $cmd->query = $query;
        }

        $count = $this->dispatcher->dispatch($cmd);
        return new JsonResponse(new CountResource($count));
    }
}
