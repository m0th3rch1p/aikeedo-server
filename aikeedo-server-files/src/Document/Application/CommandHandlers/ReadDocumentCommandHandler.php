<?php

declare(strict_types=1);

namespace Document\Application\CommandHandlers;

use Document\Application\Commands\ReadDocumentCommand;
use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Document\Domain\Services\ReadDocumentService;

/**
 * @package Document\Application\CommandHandlers
 */
class ReadDocumentCommandHandler
{
    /**
     * @param ReadDocumentService $service
     * @return void
     */
    public function __construct(
        private ReadDocumentService $service,
    ) {
    }

    /**
     * @param ReadDocumentCommand $cmd
     * @return DocumentEntity
     * @throws DocumentNotFoundException
     */
    public function handle(ReadDocumentCommand $cmd): DocumentEntity
    {
        return $this->service->findDocumentOrFail($cmd->id, $cmd->user);
    }
}
