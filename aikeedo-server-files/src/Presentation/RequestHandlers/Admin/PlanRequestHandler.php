<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Billing\Application\Commands\ReadPlanCommand;
use Billing\Domain\Exceptions\PlanNotFoundException;
use Presentation\Resources\Admin\Api\PlanResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Presentation\RequestHandlers\Admin */
#[Route(path: '/plans/[uuid:id]', method: RequestMethod::GET)]
#[Route(path: '/plans/new', method: RequestMethod::GET)]
class PlanRequestHandler extends AbstractAdminViewRequestHandler implements
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
        $id = $request->getAttribute('id');

        $data = [];

        if ($id) {
            $cmd = new ReadPlanCommand($id);

            try {
                $plan = $this->dispatcher->dispatch($cmd);
            } catch (PlanNotFoundException $th) {
                return new RedirectResponse('/admin/plans');
            }

            $data['plan'] = new PlanResource($plan);
        }

        return new ViewResponse(
            '/templates/admin/plan.twig',
            $data
        );
    }
}
