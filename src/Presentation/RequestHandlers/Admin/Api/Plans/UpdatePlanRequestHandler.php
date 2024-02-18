<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Plans;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Billing\Application\Commands\UpdatePlanCommand;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Exceptions\PlanIsLockedException;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Billing\Domain\ValueObjects\BillingCycle;
use Billing\Domain\ValueObjects\Status;
use Easy\Http\Message\StatusCode;
use Presentation\Exceptions\HttpException;
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
#[Route(path: '/[uuid:id]', method: RequestMethod::POST)]
class UpdatePlanRequestHandler extends PlanApi implements
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

        try {
            $cmd = new UpdatePlanCommand(
                $request->getAttribute('id')
            );

            if (property_exists($payload, 'title')) {
                $cmd->setTitle($payload->title);
            }

            if (property_exists($payload, 'price')) {
                $cmd->setPrice((int) $payload->price);
            }

            if (property_exists($payload, 'billing_cycle')) {
                $cmd->setBillingCycle($payload->billing_cycle);
            }

            if (property_exists($payload, 'description')) {
                $cmd->setDescription($payload->description);
            }

            if (property_exists($payload, 'token_credit')) {
                $cmd->setTokenCredit(
                    $payload->token_credit === null
                        ? $payload->token_credit
                        : (int) $payload->token_credit
                );
            }

            if (property_exists($payload, 'image_credit')) {
                $cmd->setImageCredit(
                    $payload->image_credit === null
                        ? $payload->image_credit
                        : (int) $payload->image_credit
                );
            }

            if (property_exists($payload, 'audio_credit')) {
                $cmd->setAudioCredit(
                    $payload->audio_credit === null
                        ? $payload->audio_credit
                        : (int) $payload->audio_credit
                );
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
                $list = array_filter(array_map('trim', explode(",", $payload->features)), 'strlen');
                $cmd->setFeatureList(...$list);
            }

            /** @var PlanEntity $plan */
            $plan = $this->dispatcher->dispatch($cmd);
        } catch (PlanNotFoundException $th) {
            throw new ValidationException(
                'Invalid cursor',
                property_exists($payload, 'starting_after')
                    ? 'starting_after'
                    : 'ending_before',
                previous: $th
            );
        } catch (PlanIsLockedException $th) {
            throw new HttpException(
                $th->getMessage(),
                StatusCode::LOCKED,
                null,
                $th
            );
        }

        return new JsonResponse(
            new PlanResource($plan)
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
            'title' => 'string|max:255',
            'price' => 'integer|min:0',
            'billing_cycle' => 'string|in:' . implode(",", array_map(
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
