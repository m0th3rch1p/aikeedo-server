<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api\Documents;

use Document\Application\Commands\DeleteDocumentCommand;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Domain\Entities\UserEntity;

/** @package Presentation\RequestHandlers\Api\Documents */
#[Route(path: '/[uuid:id]', method: RequestMethod::DELETE)]
class DeleteDocumentRequestHandler extends DocumentsApi implements
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
     * @throws NotFoundException 
     * @throws NoHandlerFoundException 
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $id = $request->getAttribute('id');

        $cmd = new DeleteDocumentCommand($user, $id);

        try {
            $this->dispatcher->dispatch($cmd);
        } catch (DocumentNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new EmptyResponse();
    }
}
