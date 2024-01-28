<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api\Presets;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\CountResource;
use Presentation\Response\JsonResponse;
use Preset\Application\Commands\CountPresetsCommand;
use Preset\Domain\ValueObjects\Status;
use Preset\Domain\ValueObjects\Type;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: '/count', method: RequestMethod::GET)]
class CountPresetsRequestHandler extends PresetApi
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
     * @throws NoHandlerFoundException
     */
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $cmd = new CountPresetsCommand();
        $params = (object) $request->getQueryParams();

        if (property_exists($params, 'status')) {
            $cmd->status = Status::from((int) $params->status);
        }

        if (property_exists($params, 'type')) {
            $cmd->type = Type::from($params->type);
        }

        if (property_exists($params, 'is_locked')) {
            $cmd->isLocked = (bool) $params->is_locked;
        }

        if (property_exists($params, 'query')) {
            $cmd->query = $params->query;
        }

        $count = $this->dispatcher->dispatch($cmd);
        return new JsonResponse(new CountResource($count));
    }
}
