<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Categories;

use Category\Application\Commands\CountCategoriesCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Easy\Router\Priority;
use Presentation\Resources\CountResource;
use Presentation\Response\JsonResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Presentation\RequestHandlers\Admin\Api\Categories */
#[Route(path: '/count', method: RequestMethod::GET, priority: Priority::HIGH)]
class CountCategoriesRequestHandler extends CategoryApi
implements RequestHandlerInterface
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
        $cmd = new CountCategoriesCommand();
        $count = $this->dispatcher->dispatch($cmd);
        return new JsonResponse(new CountResource($count));
    }
}
