<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Categories;

use Category\Application\Commands\DeleteCategoryCommand;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\EmptyResponse;

/** @package Category\Presentation\Admin\Api\RequestHandlers */
#[Route(path: '/[uuid:id]', method: RequestMethod::DELETE)]
class DeleteCategoryRequestHandler extends CategoryApi
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
            $cmd = new DeleteCategoryCommand($id);
            $this->dispatcher->dispatch($cmd);
        } catch (CategoryNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new EmptyResponse;
    }
}
