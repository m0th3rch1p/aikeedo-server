<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Documents;

use Document\Application\Commands\UpdateDocumentCommand;
use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Presentation\Resources\Api\DocumentResource;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Entities\UserEntity;

/** @package Presentation\RequestHandlers\Api\Documents */
#[Route(path: '/[uuid:id]', method: RequestMethod::PUT)]
#[Route(path: '/[uuid:id]', method: RequestMethod::POST)]
class UpdateDocumentRequestHandler extends DocumentsApi implements
    RequestHandlerInterface
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
     * @throws NotFoundException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);

        $payload = (object) $request->getParsedBody();

        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $cmd = new UpdateDocumentCommand(
            $user,
            $request->getAttribute('id'),
        );

        if (property_exists($payload, 'title')) {
            $cmd->setTitle($payload->title);
        }

        if (property_exists($payload, 'content')) {
            $cmd->setContent($payload->content);
        }

        try {
            /** @var DocumentEntity */
            $document = $this->dispatcher->dispatch($cmd);
        } catch (DocumentNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new JsonResponse(new DocumentResource($document));
    }

    /**
     * @param ServerRequestInterface $req 
     * @return void 
     * @throws ValidationException 
     */
    private function validateRequest(ServerRequestInterface $req): void
    {
        $this->validator->validateRequest($req, [
            'title' => 'string|max:255',
            'content' => 'string',
        ]);
    }
}
