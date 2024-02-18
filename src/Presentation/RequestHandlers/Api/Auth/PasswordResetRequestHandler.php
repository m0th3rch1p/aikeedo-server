<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Auth;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Presentation\RequestHandlers\AbstractRequestHandler;
use Presentation\Response\EmptyResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\ResetPasswordCommand;
use User\Domain\Exceptions\InvalidTokenException;
use User\Domain\Exceptions\UserNotFoundException;

/** 
 * Class PasswordResetRequestHandler 
 *
 * A class representing an API route for resetting user passwords.
 *
 * @package Presentation\RequestHandlers\Auth\Api 
 */
#[Route(path: '/recovery/[uuid:id]/[*:token]', method: RequestMethod::POST)]
class PasswordResetRequestHandler extends AuthApi implements
    RequestHandlerInterface
{
    /**
     * Constructs an instance of this class, initializing validator and 
     * dispatcher
     *
     * @param Validator $validator The validator object used to validate the 
     * request data
     * @param Dispatcher $dispatcher The dispatcher object used to dispatch 
     * CommandBus commands
     */
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * Handles incoming server requests
     *
     * Validates the request, parses id, token and password payload from the 
     * request, and attempts to dispatch a password reset command. If a user is 
     * not found or recovery token is invalid, NotFoundException is thrown.
     *
     * @param ServerRequestInterface $request The incoming server request
     * @return ResponseInterface Returns an empty response after successful 
     * execution of password reset command
     * @throws ValidationException Thrown if validation fails
     * @throws NotFoundException Thrown if user not found or recovery token is 
     * invalid
     * @throws NoHandlerFoundException Thrown if no appropriate handler is found 
     * for the dispatched command
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new ResetPasswordCommand(
            id: $request->getAttribute('id'),
            recoveryToken: $request->getAttribute('token'),
            newPassword: $payload->password
        );

        try {
            $this->dispatcher->dispatch($cmd);
        } catch (UserNotFoundException | InvalidTokenException $th) {
            throw new NotFoundException(previous: $th);
        }

        return new EmptyResponse();
    }

    /**
     * Performs request validation
     *
     * Calls the validator to check if all requirements are met, in this case 
     * verifies 'password' field is required and is a string.
     *
     * @param ServerRequestInterface $req The incoming server request to 
     * validate
     * @throws ValidationException Throws validation exception if validation 
     * fails
     */
    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'password' => 'required|string'
        ]);
    }
}
