<?php

namespace Presentation\RequestHandlers\Api\Aws;

use Aws\Application\Commands\ReadByCustomerIdAwsCommand;
use Aws\Application\Commands\UpdateAwsCommand;
use Aws\Domain\Entities\AwsEntity;
use Billing\Application\Commands\ActivateSubscriptionCommand;
use Billing\Application\Commands\CreateSubscriptionCommand;
use Billing\Application\Commands\ReadPlanByTitleCommand;
use Billing\Domain\ValueObjects\PaymentGateway;
use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\NotFoundException;
use Presentation\Response\Api\Auth\AuthResponse;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\CreateUserCommand;
use User\Application\Commands\UpdateUserCommand;
use User\Domain\Exceptions\EmailTakenException;

#[Route(path: '/register', method: RequestMethod::POST)]
class RegisterRequestHandler extends AwsApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher,
        private Validator $validator,
        #[Inject('option.site.user_accounts_enabled')]
        private bool $userAccountsEnabled = true,

        #[Inject('option.site.user_signup_enabled')]
        private bool $userSignupEnabled = true)
    {

    }

    /**
     * @throws ValidationException
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // TODO: Implement handle() method.
        $this->validateRequest($request);

        $payload = (object) $request->getParsedBody();

        $cmd = new CreateUserCommand(
            $payload->email,
            $payload->first_name,
            $payload->last_name
        );

        $cmd->setPassword($payload->password);

        try {
            //Setup User Subscription
            $awsCmd = new ReadByCustomerIdAwsCommand($payload->c_id);
            $aws = $this->dispatcher->dispatch($awsCmd);

            $planCmd = new ReadPlanByTitleCommand($aws->getDimension());
            $plan = $this->dispatcher->dispatch($planCmd);

            $user = $this->dispatcher->dispatch($cmd);

            //Set User Entity To User
            $user->setAws($aws);
            $updateUserCmd = new UpdateUserCommand($user);
            $this->dispatcher->dispatch($updateUserCmd);

            //Set Aws Entity to User
            $aws->setUser($user);
            $updateAwsCmd = new UpdateAwsCommand($aws->getId()->getValue());
            $this->dispatcher->dispatch($updateAwsCmd);

            $subCmd = new CreateSubscriptionCommand($user, $plan, new PaymentGateway('aws'));
            $response = $this->dispatcher->dispatch($subCmd);

            $activateCmd = new ActivateSubscriptionCommand($user, $response->subscription->getId());
            $this->dispatcher->dispatch($activateCmd);
        } catch (EmailTakenException $th) {
            throw new HttpException(
                message: $th->getMessage(),
                param: 'email'
            );
        } catch (NoHandlerFoundException $e) {
            return new JsonResponse($e->getMessage(), StatusCode::INTERNAL_SERVER_ERROR);
        }

        return new AuthResponse($user);
    }

    /**
     * @throws ValidationException
     */
    public function validateRequest (ServerRequestInterface $req): void
    {
        if (!$this->userAccountsEnabled || !$this->userSignupEnabled) {
            throw new NotFoundException();
        }

        $this->validator->validateRequest($req, [
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'email' => 'required|email',
            'password' => 'required|string'
        ]);
    }
}