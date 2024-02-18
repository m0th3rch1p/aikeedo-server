<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Categories;

use Category\Application\Commands\UpdateCategoryCommand;
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
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;

/** @package Category\Presentation\Admin\Api\RequestHandlers */
#[Route(path: '/[uuid:id]', method: RequestMethod::PUT)]
#[Route(path: '/[uuid:id]', method: RequestMethod::POST)]
class UpdateCategoryRequestHandler extends CategoryApi
implements RequestHandlerInterface
{
    /**
     * @param Validator $validator 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        public Validator $validator,
        public Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws ValidationException 
     * @throws NotFoundException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);

        $id = $request->getAttribute('id');
        $payload = (object) $request->getParsedBody();

        $cmd = new UpdateCategoryCommand($id);

        if (property_exists($payload, 'title')) {
            $cmd->setTitle($payload->title);
        }

        try {
            /** @var CategoryEntity $category */
            $category = $this->dispatcher->dispatch($cmd);
        } catch (CategoryNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new JsonResponse(new CategoryResource($category));
    }

    /**
     * @param ServerRequestInterface $req 
     * @return void 
     * @throws ValidationException 
     */
    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'title' => 'string|max:255'
        ]);
    }
}
