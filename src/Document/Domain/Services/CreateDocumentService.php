<?php

declare(strict_types=1);

namespace Document\Domain\Services;

use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Events\DocumentCreatedEvent;
use Document\Domain\Repositories\DocumentRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/**
 * @package Document\Domain\Services
 */
class CreateDocumentService
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
    }

    /**
     * @param DocumentEntity $document
     * @return void
     */
    public function createDocument(DocumentEntity $document)
    {
        // Add the document to the repository
        $this->repo
            ->add($document)
            ->flush();

        // Dispatch the document created event
        $event = new DocumentCreatedEvent($document);
        $this->dispatcher->dispatch($event);
    }
}
