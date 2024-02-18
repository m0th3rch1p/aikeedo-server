<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Users;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Presentation\Middlewares\DemoEnvironmentMiddleware;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\JsonResponse;
use Presentation\Resources\Admin\Api\UserResource;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use User\Application\Commands\UpdateUserCommand;
use User\Domain\Exceptions\UserNotFoundException;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\Status;

/** @package Presentation\RequestHandlers\Admin\Api\Users */
#[Middleware(DemoEnvironmentMiddleware::class)]
#[Route(path: '/[uuid:id]', method: RequestMethod::POST)]
#[Route(path: '/[uuid:id]', method: RequestMethod::PUT)]
class UpdateUserRequestHandler extends UserApi implements
    RequestHandlerInterface
{
    /**
     * @param Validator $validator 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws ValidationException 
     * @throws NotFoundException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new UpdateUserCommand($request->getAttribute('id'));

        if (property_exists($payload, 'first_name')) {
            $cmd->setFirstName($payload->first_name);
        }

        if (property_exists($payload, 'last_name')) {
            $cmd->setLastName($payload->last_name);
        }

        if (property_exists($payload, 'language')) {
            $cmd->setLanguage($payload->language);
        }

        if (property_exists($payload, 'status')) {
            $cmd->setStatus((int) $payload->status);
        }

        if (property_exists($payload, 'role')) {
            $cmd->setRole((int) $payload->role);
        }

        try {
            $user = $this->dispatcher->dispatch($cmd);
        } catch (UserNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new JsonResponse(
            new UserResource($user)
        );
    }

    /**
     * @param ServerRequestInterface $req 
     * @return void 
     * @throws ValidationException 
     */
    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'first_name' => 'string|max:50',
            'last_name' => 'string|max:50',
            'status' => 'integer|in:' . implode(",", array_map(
                fn (Status $type) => $type->value,
                Status::cases()
            )),
            'role' => 'integer|in:' . implode(",", array_map(
                fn (Role $type) => $type->value,
                Role::cases()
            ))
        ]);
    }
}
