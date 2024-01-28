<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Plans;

use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Billing\Application\Commands\CreatePlanCommand;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\Status;
use Presentation\Resources\Admin\Api\PlanResource;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Presentation\RequestHandlers\Admin\Api\Plans */
#[Route(path: '/', method: RequestMethod::POST)]
class CreatePlanRequestHandler extends PlanApi implements
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

        $cmd = new CreatePlanCommand(
            $payload->title,
            (int)$payload->price,
            $payload->billing_cycle
        );

        if (property_exists($payload, 'description')) {
            $cmd->setDescription($payload->description);
        }

        if (property_exists($payload, 'token_credit')) {
            $cmd->setTokenCredit((int) $payload->token_credit);
        }

        if (property_exists($payload, 'image_credit')) {
            $cmd->setImageCredit((int) $payload->image_credit);
        }

        if (property_exists($payload, 'audio_credit')) {
            $cmd->setAudioCredit((int) $payload->audio_credit);
        }

        if (property_exists($payload, 'superiority')) {
            $cmd->setSuperiority((int) $payload->superiority);
        }

        if (property_exists($payload, 'status')) {
            $cmd->setStatus((int) $payload->status);
        }

        if (property_exists($payload, 'is_featured')) {
            $cmd->setIsFeatured((bool) $payload->is_featured);
        }

        if (property_exists($payload, 'icon')) {
            $cmd->setIcon($payload->icon);
        }

        if (property_exists($payload, 'features')) {
            $list = explode(",", $payload->features);
            $list = array_filter($list, fn ($item) => !empty(trim($item)));
            $cmd->setFeatureList(...$list);
        }

        /** @var PlanEntity $plan */
        $plan = $this->dispatcher->dispatch($cmd);

        return new JsonResponse(
            new PlanResource($plan),
            StatusCode::CREATED
        );
    }

    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'title' => 'required|string|max:255',
            'price' => 'required|integer|min:0',
            'billing_cycle' => 'required|string|in:' . implode(",", array_map(
                fn (BillingCycle $type) => $type->value,
                BillingCycle::cases()
            )),
            'description' => 'string',
            'token_credit' => 'integer|min:0',
            'image_credit' => 'integer|min:0',
            'audio_credit' => 'integer|min:0',
            'superiority' => 'integer|min:0',
            'status' => 'integer|in:' . implode(",", array_map(
                fn (Status $type) => $type->value,
                Status::cases()
            )),
            'is_featured' => 'integer|in:0,1',
            'icon' => 'string',
            'features' => 'string',
        ]);
    }
}
