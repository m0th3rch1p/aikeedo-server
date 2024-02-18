<?php

declare(strict_types=1);

namespace Document\Domain\Services;

use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Events\DocumentUpdatedEvent;
use Document\Domain\Repositories\DocumentRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Document\Domain\Services
 */
class UpdateDocumentService extends ReadDocumentService
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
    public function updateDocument(DocumentEntity $document)
    {
        // Call the pre update hooks
        $document->preUpdate();

        // Update the document in the repository
        $this->repo->flush();

        // Dispatch the document updated event
        $event = new DocumentUpdatedEvent($document);
        $this->dispatcher->dispatch($event);
    }
}
