<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Categories;

use Category\Application\Commands\ReadCategoryCommand;
use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Presentation\Resources\Admin\Api\CategoryResource;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\JsonResponse;

/** @package Category\Presentation\Admin\Api\RequestHandlers */
#[Route(path: '/[uuid:id]', method: RequestMethod::GET)]
class ReadCategoryRequestHandler extends CategoryApi
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
     * @throws NotFoundException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');

        try {
            $cmd = new ReadCategoryCommand($id);
            /** @var CategoryEntity $category */
            $category = $this->dispatcher->dispatch($cmd);
        } catch (CategoryNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new JsonResponse(
            new CategoryResource($category)
        );
    }
}
