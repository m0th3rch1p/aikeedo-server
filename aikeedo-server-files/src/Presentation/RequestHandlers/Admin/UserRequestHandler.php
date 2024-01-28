<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Admin\Api\UserResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Application\Commands\ReadUserCommand;
use User\Domain\Exceptions\UserNotFoundException;

#[Route(path: '/users/[uuid:id]', method: RequestMethod::GET)]
#[Route(path: '/users/new', method: RequestMethod::GET)]
class UserRequestHandler extends AbstractAdminViewRequestHandler implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');

        $data = [];

        if ($id) {
            $cmd = new ReadUserCommand($id);

            try {
                $user = $this->dispatcher->dispatch($cmd);
            } catch (UserNotFoundException $th) {
                return new RedirectResponse('/admin/users');
            }

            $data['user'] = new UserResource($user);
        }

        return new ViewResponse(
            '/templates/admin/user.twig',
            $data
        );
    }
}
