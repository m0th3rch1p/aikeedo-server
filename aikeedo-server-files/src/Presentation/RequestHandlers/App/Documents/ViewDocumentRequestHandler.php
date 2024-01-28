<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App\Documents;

use Document\Application\Commands\ReadDocumentCommand;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Api\DocumentResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Entities\UserEntity;

/** @package Presentation\RequestHandlers\App\Documents */
#[Route(path: '/[uuid:id]', method: RequestMethod::GET)]
class ViewDocumentRequestHandler extends DocumentsView implements
    RequestHandlerInterface
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
        $id = $request->getAttribute('id');

        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $cmd = new ReadDocumentCommand($user, $id);

        try {
            $document = $this->dispatcher->dispatch($cmd);
        } catch (DocumentNotFoundException $th) {
            return new RedirectResponse('/app/documents');
        }

        return new ViewResponse(
            '/templates/app/documents/view.twig',
            [
                'document' => new DocumentResource($document),
            ]
        );
    }
}
