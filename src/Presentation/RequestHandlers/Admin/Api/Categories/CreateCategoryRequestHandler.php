<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Categories;

use Category\Application\Commands\CreateCategoryCommand;
use Category\Domain\Entities\CategoryEntity;
use Presentation\Resources\Admin\Api\CategoryResource;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;

/** @package Category\Presentation\Admin\Api\RequestHandlers */
#[Route(path: '/', method: RequestMethod::POST)]
class CreateCategoryRequestHandler extends CategoryApi
implements RequestHandlerInterface
{
    /**
     * @param Validator $validator 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Validator $validator,
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param ServerRequestInterface $request 
     * @return ResponseInterface 
     * @throws ValidationException 
     * @throws NoHandlerFoundException 
     */
    public function handle(
        ServerRequestInterface $request
    ): ResponseInterface {
        $this->validateRequest($request);
        $payload = (object) $request->getParsedBody();

        $cmd = new CreateCategoryCommand(
            $payload->title,
        );

        /** @var CategoryEntity $category */
        $category = $this->dispatcher->dispatch($cmd);

        return new JsonResponse(
            new CategoryResource($category),
            StatusCode::CREATED
        );
    }

    /**
     * @param ServerRequestInterface $req 
     * @return void 
     * @throws ValidationException 
     */
    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'title' => 'required|string|max:255'
        ]);
    }
}
