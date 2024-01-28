<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Users;

use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\NotFoundException;
use Presentation\Middlewares\DemoEnvironmentMiddleware;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\EmptyResponse;
use User\Application\Commands\DeleteUserCommand;
use User\Application\Commands\ReadUserCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;

/** @package Presentation\RequestHandlers\Admin\Api\Users */
#[Middleware(DemoEnvironmentMiddleware::class)]
#[Route(path: '/[uuid:id]', method: RequestMethod::DELETE)]
class DeleteUserRequestHandler extends UserApi implements
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
     * @throws NotFoundException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');

        $cmd = new ReadUserCommand($id);

        try {
            $user = $this->dispatcher->dispatch($cmd);
        } catch (UserNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        $cmd = new DeleteUserCommand($id);
        $authUser = $request->getAttribute(UserEntity::class);

        if ($user->getId() == $authUser->getId()) {
            throw new HttpException(statusCode: StatusCode::FORBIDDEN);
        }

        try {
            $this->dispatcher->dispatch($cmd);
        } catch (UserNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new EmptyResponse();
    }
}
