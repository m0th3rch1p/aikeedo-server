<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Billing;

use Billing\Application\Commands\CountPlansCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\CountResource;
use Presentation\Response\JsonResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: '/plans/count', method: RequestMethod::GET)]
class CountPlansRequestHandler extends BillingApi implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $params = (object) $request->getQueryParams();

        $cmd = new CountPlansCommand();
        $cmd->setStatus(1);

        if (property_exists($params, 'billing_cycle') && $params->billing_cycle) {
            $cmd->setBillingCycle($params->billing_cycle);
        }

        if ($query = $request->getQueryParams()['query'] ?? null) {
            $cmd->query = $query;
        }

        $count = $this->dispatcher->dispatch($cmd);
        return new JsonResponse(new CountResource($count));
    }
}
