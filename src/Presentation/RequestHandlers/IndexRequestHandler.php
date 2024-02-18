<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers;

use Billing\Application\Commands\ListPlansCommand;
use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Middleware;
use Easy\Router\Attributes\Route;
use Presentation\Middlewares\ViewMiddleware;
use Presentation\Resources\PlanResource;
use Presentation\Response\RedirectResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Presentation\Response\ViewResponse;
use Shared\Infrastructure\CommandBus\Dispatcher;

/** @package Presentation\RequestHandlers */
#[Middleware(ViewMiddleware::class)]
#[Route(path: '/[locale:locale]?', method: RequestMethod::GET)]
class IndexRequestHandler extends AbstractRequestHandler implements
    RequestHandlerInterface
{
    /**
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Dispatcher $dispatcher,

        #[Inject('option.site.is_landing_page_enabled')]
        private bool $isLandingPageEnabled = true,

        #[Inject('config.locale.locales')]
        private array $locales = []
    ) {
    }

    /**
     * @param ServerRequestInterface $request
     * @return ResponseInterface
     */
    public function handle(
        ServerRequestInterface $request
    ): ResponseInterface {
        if (!$this->isLandingPageEnabled) {
            return new RedirectResponse('/app');
        }

        $cmd = new ListPlansCommand();
        $cmd->setStatus(1);
        $cmd->setOrderBy('price', 'ASC');
        $plans = $this->dispatcher->dispatch($cmd);

        $resources = [];
        foreach ($plans as $plan) {
            $resources[] = new PlanResource($plan);
        };

        return new ViewResponse(
            '@theme/templates/home.twig',
            [
                'plans' =>  $resources,
                'locales' => $this->locales,
            ]
        );
    }
}
