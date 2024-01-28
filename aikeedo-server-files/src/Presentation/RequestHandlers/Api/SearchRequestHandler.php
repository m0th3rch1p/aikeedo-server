<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Api;

use Document\Application\Commands\ListDocumentsCommand;
use Document\Domain\Entities\DocumentEntity;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Api\DocumentResource;
use Presentation\Resources\Api\PresetResource;
use Presentation\Resources\ListResource;
use Presentation\Response\JsonResponse;
use Preset\Application\Commands\ListPresetsCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\ValueObjects\Status;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Traversable;
use User\Domain\Entities\UserEntity;

#[Route(path: '/search', method: RequestMethod::GET)]
class SearchRequestHandler extends Api implements RequestHandlerInterface
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
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        $list = new ListResource();

        $params = (object) $request->getQueryParams();
        $query = $params->query ?? null;
        $limit = $params->limit ?? null;

        $this
            ->searchPresets($list, $query, $limit)
            ->searchDocuments($list, $user, $query, $limit);

        return new JsonResponse($list);
    }

    /**
     * @param ListResource $list
     * @param null|string $query
     * @param null|int $limit
     * @return SearchRequestHandler
     * @throws NoHandlerFoundException
     */
    private function searchPresets(
        ListResource $list,
        ?string $query,
        ?int $limit
    ): self {
        $cmd = new ListPresetsCommand();
        $cmd->status = Status::from(1);

        if ($query) {
            $cmd->query = $query;
        }

        if ($limit) {
            $cmd->setLimit($limit);
        }

        /** @var Traversable<int,PresetEntity> $presets */
        $presets = $this->dispatcher->dispatch($cmd);

        foreach ($presets as $preset) {
            $list->pushData(new PresetResource($preset));
        }

        return $this;
    }

    /**
     * @param ListResource $list
     * @param UserEntity $user
     * @param null|string $query
     * @param null|int $limit
     * @return SearchRequestHandler
     * @throws NoHandlerFoundException
     */
    private function searchDocuments(
        ListResource $list,
        UserEntity $user,
        ?string $query,
        ?int $limit
    ): self {
        $cmd = new ListDocumentsCommand($user);

        if ($query) {
            $cmd->query = $query;
        }

        if ($limit) {
            $cmd->setLimit($limit);
        }

        /** @var Traversable<int,DocumentEntity> $presets */
        $documents = $this->dispatcher->dispatch($cmd);
        foreach ($documents as $doc) {
            $list->pushData(new DocumentResource($doc));
        }

        return $this;
    }
}
