<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Admin\Api\PresetResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Preset\Application\Commands\ReadPresetCommand;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Presentation\RequestHandlers\Admin */
#[Route(path: '/templates/[uuid:id]', method: RequestMethod::GET)]
#[Route(path: '/templates/new', method: RequestMethod::GET)]
class PresetRequestHandler extends AbstractAdminViewRequestHandler implements
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

        $data = [];

        if ($id) {
            $cmd = new ReadPresetCommand($id);

            try {
                $plan = $this->dispatcher->dispatch($cmd);
            } catch (PresetNotFoundException $th) {
                return new RedirectResponse('/admin/presets');
            }

            $data['preset'] = new PresetResource($plan);
        }

        return new ViewResponse(
            '/templates/admin/preset.twig',
            $data
        );
    }
}
