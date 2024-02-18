<?php

declare(strict_types=1);

namespace Document\Application\CommandHandlers;

use Document\Application\Commands\CountDocumentsCommand;
use Document\Domain\Repositories\DocumentRepositoryInterface;

/**
 * @package Document\Application\CommandHandlers
 */
class CountDocumentsCommandHandler
{
    /**
     * @param DocumentRepositoryInterface $repo
     * @return void
     */
    public function __construct(
        private DocumentRepositoryInterface $repo,
    ) {
    }

    /**
     * @param CountDocumentsCommand $cmd
     * @return int
     */
    public function handle(CountDocumentsCommand $cmd): int
    {
        $documents = $this->repo
            ->filterByUser($cmd->user);

        if ($cmd->query) {
            $documents = $documents->search($cmd->query);
        }

        return $documents->count();
    }
}
