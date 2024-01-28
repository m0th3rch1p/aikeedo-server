<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Account;

use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Presentation\Resources\Api\UserResource;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\UpdateEmailCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\EmailTakenException;
use User\Domain\Exceptions\InvalidPasswordException;
use User\Domain\Exceptions\UserNotFoundException;

/** @package Presentation\RequestHandlers\Api\Account */
#[Route(path: '/email', method: RequestMethod::PUT)]
#[Route(path: '/email', method: RequestMethod::POST)]
class ChangeEmailRequestHandler extends AccountApi implements
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
     * @throws UserNotFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new UpdateEmailCommand(
            $user,
            $payload->email,
            $payload->password
        );

        try {
            $user = $this->dispatcher->dispatch($cmd);
        } catch (InvalidPasswordException $th) {
            throw new HttpException(
                'The password you entered is incorrect.',
                StatusCode::FORBIDDEN,
                'password',
                $th
            );
        } catch (EmailTakenException $th) {
            throw new HttpException(
                'The email you entered is already taken.',
                StatusCode::CONFLICT,
                'email',
                $th
            );
        }

        return new JsonResponse(new UserResource($user));
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
            'password' => 'required|string'
        ]);
    }
}
