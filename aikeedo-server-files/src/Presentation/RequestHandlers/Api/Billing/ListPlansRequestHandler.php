<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Billing;

use Billing\Application\Commands\ListPlansCommand;
use Billing\Domain\Entities\PlanEntity;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Iterator;
use Presentation\Resources\Api\PlanResource;
use Presentation\Resources\ListResource;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: '/plans', method: RequestMethod::GET)]
class ListPlansRequestHandler extends BillingApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $params = (object) $request->getQueryParams();

        $cmd = new ListPlansCommand();
        $cmd->setStatus(1);

        if (property_exists($params, 'billing_cycle') && $params->billing_cycle) {
            $cmd->setBillingCycle($params->billing_cycle);
        }

        if (property_exists($params, 'sort') && $params->sort) {
            $sort = explode(':', $params->sort);
            $orderBy = $sort[0];
            $dir = $sort[1] ?? 'desc';
            $cmd->setOrderBy($orderBy, $dir);
        }

        if (property_exists($params, 'starting_after') && $params->starting_after) {
            $cmd->setCursor(
                $params->starting_after,
                'starting_after'
            );
        } elseif (property_exists($params, 'ending_before') && $params->ending_before) {
            $cmd->setCursor(
                $params->ending_before,
                'ending_before'
            );
        }

        if (property_exists($params, 'limit')) {
            $cmd->setLimit((int) $params->limit);
        }

        if ($query = $request->getQueryParams()['query'] ?? null) {
            $cmd->query = $query;
        }

        try {
            /** @var Iterator<int,PlanEntity> $plans */
            $plans = $this->dispatcher->dispatch($cmd);
        } catch (PlanNotFoundException $th) {
            throw new ValidationException(
                'Invalid cursor',
                property_exists($params, 'starting_after')
                    ? 'starting_after'
                    : 'ending_before',
                previous: $th
            );
        }

        $res = new ListResource();
        foreach ($plans as $plan) {
            $res->pushData(new PlanResource($plan));
        }

        return new JsonResponse($res);
    }
}
