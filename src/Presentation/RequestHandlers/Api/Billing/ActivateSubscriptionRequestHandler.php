<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Billing;

use Billing\Application\Commands\ActivateSubscriptionCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Presentation\Resources\Api\SubscriptionResource;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\SubscriptionNotFoundException;

/** @package Presentation\RequestHandlers\Api\Billing */
#[Route(path: '/subscriptions/[uuid:id]/activate', method: RequestMethod::POST)]
class ActivateSubscriptionRequestHandler extends BillingApi implements
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
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);
        $id = $request->getAttribute('id');

        $cmd = new ActivateSubscriptionCommand(
            $user,
            $id
        );

        if (property_exists($payload, 'external_id')) {
            $cmd->setExternalId($payload->external_id);
        }

        try {
            /** @var SubscriptionEntity */
            $subscription = $this->dispatcher->dispatch($cmd);
        } catch (SubscriptionNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new JsonResponse(
            new SubscriptionResource($subscription)
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
            'external_id' => 'string'
        ]);
    }
}
