<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Documents;

use Document\Application\Commands\CreateDocumentCommand;
use Document\Domain\Entities\DocumentEntity;
use Easy\Http\Message\RequestMethod;
use Easy\Http\Message\StatusCode;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Api\DocumentResource;
use Presentation\Response\JsonResponse;
use Presentation\Validation\ValidationException;
use Presentation\Validation\Validator;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Entities\UserEntity;

/** @package Presentation\RequestHandlers\Api\Documents */
#[Route(path: '/', method: RequestMethod::POST)]
class CreateDocumentRequestHandler extends DocumentsApi
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
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->validateRequest($request);

        $payload = (object) $request->getParsedBody();

        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $cmd = new CreateDocumentCommand(
            $user,
            $payload->title,
        );

        if (property_exists($payload, 'preset')) {
            $cmd->setPreset($payload->preset);
        }

        if (property_exists($payload, 'content')) {
            $cmd->setContent($payload->content);
        }

        try {
            /** @var DocumentEntity */
            $document = $this->dispatcher->dispatch($cmd);
        } catch (PresetNotFoundException $th) {
            throw new ValidationException(
                'Invalid preset ID',
                'preset_id',
                previous: $th
            );
        }

        return new JsonResponse(
            new DocumentResource($document),
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
            'title' => 'required|string|max:255',
            'preset' => 'sometimes|uuid',
            'content' => 'string',
        ]);
    }
}
