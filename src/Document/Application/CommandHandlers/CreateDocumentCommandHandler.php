<?php

declare(strict_types=1);

namespace Document\Application\CommandHandlers;

use Document\Application\Commands\CreateDocumentCommand;
use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Services\CreateDocumentService;
use Preset\Application\Commands\ReadPresetCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use User\Application\Commands\ReadUserCommand;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\UserNotFoundException;

/**
 * @package Document\Application\CommandHandlers
 */
class CreateDocumentCommandHandler
{
    /**
     * @param CreateDocumentService $service 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private CreateDocumentService $service,
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param CreateDocumentCommand $cmd 
     * @return DocumentEntity 
     * @throws NoHandlerFoundException 
     * @throws UserNotFoundException 
     * @throws PresetNotFoundException 
     */
    public function handle(CreateDocumentCommand $cmd): DocumentEntity
    {
        $user = $cmd->user;
        $preset = $cmd->preset;

        if ($user instanceof Id) {
            /** @var UserEntity */
            $user = $this->dispatcher->dispatch(
                new ReadUserCommand($user)
            );
        }

        if ($preset instanceof Id) {
            /** @var PresetEntity */
            $preset = $this->dispatcher->dispatch(
                new ReadPresetCommand($preset)
            );
        }

        $document = new DocumentEntity(
            $cmd->title,
            $user,
            $preset
        );

        if ($cmd->content) {
            $document->setContent($cmd->content);
        }

        $this->service->createDocument($document);
        return $document;
    }
}
