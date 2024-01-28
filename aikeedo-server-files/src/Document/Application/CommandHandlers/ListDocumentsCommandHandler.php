<?php

declare(strict_types=1);

namespace Document\Application\CommandHandlers;

use Document\Application\Commands\ListDocumentsCommand;
use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Document\Domain\Repositories\DocumentRepositoryInterface;
use Document\Domain\Services\ReadDocumentService;
use Shared\Domain\ValueObjects\CursorDirection;
use Traversable;

/**
 * @package Document\Application\CommandHandlers
 */
class ListDocumentsCommandHandler
{
    /**
     * @param DocumentRepositoryInterface $repo
     * @param ReadDocumentService $service
     * @return void
     */
    public function __construct(
        private DocumentRepositoryInterface $repo,
        private ReadDocumentService $service,
    ) {
    }

    /**
     * @param ListDocumentsCommand $cmd
     * @return Traversable<DocumentEntity>
     * @throws DocumentNotFoundException
     */
    public function handle(ListDocumentsCommand $cmd): Traversable
    {
        $cursor = $cmd->cursor
            ? $this->service->findDocumentOrFail(
                $cmd->cursor,
                $cmd->user
            )
            : null;

        $documents = $this->repo
            ->filterByUser($cmd->user)
            ->sort($cmd->sortDirection, $cmd->sortParameter);

        if ($cmd->query) {
            $documents = $documents->search($cmd->query);
        }

        if ($cmd->maxResults) {
            $documents = $documents->setMaxResults($cmd->maxResults);
        }

        if ($cursor) {
            if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {
                return $documents = $documents->endingBefore($cursor);
            }

            return $documents->startingAfter($cursor);
        }

        return $documents;
    }
}
