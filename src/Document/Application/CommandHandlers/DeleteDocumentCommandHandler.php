<?php

declare(strict_types=1);

namespace Document\Application\CommandHandlers;

use Document\Application\Commands\DeleteDocumentCommand;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Document\Domain\Services\DeleteDocumentService;

/**
 * @package Document\Application\CommandHandlers
 */
class DeleteDocumentCommandHandler
{
    /**
     * @param DeleteDocumentService $service
     * @return void
     */
    public function __construct(
        private DeleteDocumentService $service,
    ) {
    }

    /**
     * @param DeleteDocumentCommand $cmd 
     * @return void 
     * @throws DocumentNotFoundException 
     */
    public function handle(DeleteDocumentCommand $cmd): void
    {
        $document = $this->service->findDocumentOrFail($cmd->id, $cmd->user);
        $this->service->deleteDocument($document);
    }
}
