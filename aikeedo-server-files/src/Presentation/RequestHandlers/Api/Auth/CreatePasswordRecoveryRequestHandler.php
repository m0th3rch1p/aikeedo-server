<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Auth;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Presentation\Middlewares\CaptchaMiddleware;
use Presentation\Response\EmptyResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\CreatePasswordRecoveryCommand;
use User\Domain\Exceptions\UserNotFoundException;

/** 
 * Class CreatePasswordRecoveryRequestHandler 
 *
 * A class representing an API route for creating password recovery requests.
 *
 * @package Presentation\RequestHandlers\Auth\Api 
 */
#[Middleware(CaptchaMiddleware::class)]
#[Route(path: '/recovery', method: RequestMethod::POST)]
class CreatePasswordRecoveryRequestHandler extends AuthApi implements
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
     * Validates the request, parses email payload from the request body, and 
     * attempts to dispatch a password recovery command. If a user is not found 
     * by their email, it throws a NotFoundException.
     *
     * @param ServerRequestInterface $request The incoming server request
     * @return ResponseInterface Returns an empty response after successful 
     * execution of password recovery command
     * @throws ValidationException Thrown if validation fails
     * @throws NotFoundException Thrown if no user is found with given email
     * @throws NoHandlerFoundException Thrown if no appropriate handler is found
     * for the dispatched command
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new CreatePasswordRecoveryCommand(
            $payload->email
        );

        try {
            $this->dispatcher->dispatch($cmd);
        } catch (UserNotFoundException $th) {
            throw new NotFoundException(
                message: $th->getMessage(),
                param: 'email'
            );
        }

        return new EmptyResponse();
    }

    /**
     * Performs request validation
     *
     * Calls the validator to check if all requirements are met, in this case 
     * verifies `email` field is required and valid.
     *
     * @param ServerRequestInterface $req The incoming server request to validate
     * @throws ValidationException Throws validation exception if validation 
     * fails
     */
    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'email' => 'required|email',
        ]);
    }
}
