<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Category\Application\Commands\ReadCategoryCommand;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Admin\Api\CategoryResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: '/categories/[uuid:id]', method: RequestMethod::GET)]
#[Route(path: '/categories/new', method: RequestMethod::GET)]
class CategoryRequestHandler extends AbstractAdminViewRequestHandler implements
    RequestHandlerInterface
{
    public function __construct(
        private Dispatcher $dispatcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');

        $data = [];

        if ($id) {
            $cmd = new ReadCategoryCommand($id);

            try {
                $category = $this->dispatcher->dispatch($cmd);
            } catch (CategoryNotFoundException $th) {
                return new RedirectResponse('/admin/categories');
            }

            $data['category'] = new CategoryResource($category);
        }

        return new ViewResponse(
            '/templates/admin/category.twig',
            $data
        );
    }
}
