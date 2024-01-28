<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Users;

use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\JsonResponse;
use User\Application\Commands\CreateUserCommand;
use Presentation\Resources\Admin\Api\UserResource;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use User\Domain\Exceptions\EmailTakenException;
use User\Domain\ValueObjects\Role;
use User\Domain\ValueObjects\Status;

/** @package Presentation\RequestHandlers\Admin\Api\Users */
#[Route(path: '/', method: RequestMethod::POST)]
class CreateUserRequestHandler extends UserApi implements
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
     * @throws HttpException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new CreateUserCommand(
            email: $payload->email,
            firstName: $payload->first_name,
            lastName: $payload->last_name
        );

        if ($payload->language ?? null) {
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
        } catch (EmailTakenException $th) {
            throw new HttpException(
                statusCode: StatusCode::CONFLICT,
                param: 'email',
                previous: $th
            );
        }

        return new JsonResponse(
            new UserResource($user),
            StatusCode::CREATED
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
            'email' => 'required|email',
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
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
