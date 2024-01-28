<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Plans;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Easy\Router\Priority;
use Billing\Application\Commands\CountPlansCommand;
use Presentation\Resources\CountResource;
use Presentation\Response\JsonResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Presentation\RequestHandlers\Admin\Api\Plans */
#[Route(path: '/count', method: RequestMethod::GET, priority: Priority::HIGH)]
class CountPlansRequestHandler extends PlanApi implements
    RequestHandlerInterface
{
    /**
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $cmd = new CountPlansCommand();
        $params = (object) $request->getQueryParams();

        if (property_exists($params, 'status')) {
            $cmd->setStatus((int)$params->status);
        }

        if (property_exists($params, 'billing_cycle')) {
            $cmd->setBillingCycle($params->billing_cycle);
        }

        if (property_exists($params, 'query')) {
            $cmd->query = $params->query;
        }

        $count = $this->dispatcher->dispatch($cmd);
        return new JsonResponse(new CountResource($count));
    }
}
