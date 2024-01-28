<?php

declare(strict_types=1);

namespace Document\Application\CommandHandlers;

use Document\Application\Commands\UpdateDocumentCommand;
use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Document\Domain\Services\UpdateDocumentService;

/**
 * @package Document\Application\CommandHandlers
 */
class UpdateDocumentCommandHandler
{
    /**
     * @param UpdateDocumentService $service
     * @return void
     */
    public function __construct(
        private UpdateDocumentService $service,
    ) {
    }

    /**
     * @param UpdateDocumentCommand $cmd
     * @return DocumentEntity
     * @throws DocumentNotFoundException
     */
    public function handle(UpdateDocumentCommand $cmd): DocumentEntity
    {
        $document = $this->service->findDocumentOrFail($cmd->id, $cmd->user);

        if ($cmd->title) {
            $document->setTitle($cmd->title);
        }

        if ($cmd->content) {
            $document->setContent($cmd->content);
        }

        $this->service->updateDocument($document);
        return $document;
    }
}
