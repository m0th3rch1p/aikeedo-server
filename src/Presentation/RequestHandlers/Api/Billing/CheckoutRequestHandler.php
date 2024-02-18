<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Billing;

use Billing\Application\Commands\CreateSubscriptionCommand;
use Billing\Application\Responses\SubscriptionResponse;
use Billing\Domain\Payments\GatewayNotFoundException;
use Billing\Domain\Payments\PaymentException;
use Billing\Domain\ValueObjects\PaymentGateway;
use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\HttpException;
use Presentation\Exceptions\UnprocessableEntityException;
use Presentation\Resources\Api\SubscriptionResource;
use Presentation\Response\JsonResponse;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use User\Domain\Entities\UserEntity;

#[Route(path: '/checkout', method: RequestMethod::POST)]
class CheckoutRequestHandler extends BillingApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher,

        #[Inject('option.billing.trial_period_days')]
        private ?string $trialPeriodDays = null
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        /** @var string */
        $planId = $payload->id;

        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $days = $this->trialPeriodDays;

        if (!is_null($days)) {
            $days = (int) $days;

            if ($days < 0) {
                $days = null;
            }
        }

        $cmd = new CreateSubscriptionCommand(
            $user,
            $planId,
            $payload->gateway ?: new PaymentGateway(),
            $days
        );

        try {
            /** @var SubscriptionResponse */
            $resp = $this->dispatcher->dispatch($cmd);
        } catch (GatewayNotFoundException $th) {
            throw new HttpException(
                param: 'gateway',
                statusCode: StatusCode::BAD_REQUEST,
                previous: $th,
            );
        } catch (PaymentException $th) {
            throw new UnprocessableEntityException(
                previous: $th,
            );
        }

        return new JsonResponse([
            'subscription' => new SubscriptionResource($resp->subscription),
            'params' => $resp->params
        ], StatusCode::CREATED);
    }

    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'id' => 'required|uuid',
            'gateway' => 'string'
        ]);
    }
}
