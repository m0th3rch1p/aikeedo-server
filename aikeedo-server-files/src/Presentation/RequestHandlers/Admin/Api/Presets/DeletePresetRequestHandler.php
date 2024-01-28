<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Presets;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Exceptions\NotFoundException;
use Preset\Application\Commands\DeletePresetCommand;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Presentation\Response\EmptyResponse;

/** @package Preset\Presentation\Admin\Api\RequestHandlers */
#[Route(path: '/[uuid:id]', method: RequestMethod::DELETE)]
class DeletePresetRequestHandler extends PresetApi implements
    RequestHandlerInterface
{
    /**
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private Dispatcher $dispatcher,
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
        $cmd = new DeletePresetCommand($id);

        try {
            $this->dispatcher->dispatch($cmd);
        } catch (PresetNotFoundException $th) {
            throw new NotFoundException(
                param: 'id',
                previous: $th
            );
        }

        return new EmptyResponse();
    }
}
