<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App\Billing;

use Billing\Application\Commands\ReadPlanCommand;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Api\PlanResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: '/checkout/[uuid:id]?', method: RequestMethod::GET)]
class ViewCheckoutRequestHandler extends BillingView implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');
        $plan = null;

        if ($id) {
            try {
                $command = new ReadPlanCommand($id);
                $plan = $this->dispatcher->dispatch($command);
            } catch (PlanNotFoundException $th) {
                return new RedirectResponse('/app/billing/checkout');
            }

            if (!$plan->isActive()) {
                return new RedirectResponse('/app/billing/checkout');
            }
        }

        return new ViewResponse(
            '/templates/app/billing/checkout.twig',
            [
                'plan' => $plan ? new PlanResource($plan) : null
            ]
        );
    }
}
