<?php

declare(strict_types=1);

namespace Document\Domain\Services;

use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Events\DocumentDeletedEvent;
use Document\Domain\Repositories\DocumentRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Document\Domain\Services
 */
class DeleteDocumentService extends ReadDocumentService
{
    /**
     * @param DocumentRepositoryInterface $repo
     * @param EventDispatcherInterface $dispatcher
     * @return void
     */
    public function __construct(
        private DocumentRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher,
    ) {
        parent::__construct($repo);
    }

    /**
     * @param DocumentEntity $document
     * @return void
     */
    public function deleteDocument(DocumentEntity $document)
    {
        // Delete the document from the repository
        $this->repo
            ->remove($document)
            ->flush();

        // Dispatch the document deleted event
        $event = new DocumentDeletedEvent($document);
        $this->dispatcher->dispatch($event);
    }
}
