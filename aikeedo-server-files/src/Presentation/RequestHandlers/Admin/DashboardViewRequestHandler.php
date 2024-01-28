<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Billing\Application\Commands\CountPlansCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: '/[dashboard]?', method: RequestMethod::GET)]
class DashboardViewRequestHandler extends AbstractAdminViewRequestHandler implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $cmd = new CountPlansCommand();
        $count = $this->dispatcher->dispatch($cmd);

        return new ViewResponse(
            '/templates/admin/dashboard.twig',
            [
                'plans_count' => $count
            ]
        );
    }
}
