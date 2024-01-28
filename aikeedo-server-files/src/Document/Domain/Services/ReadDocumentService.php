<?php

declare(strict_types=1);

namespace Document\Domain\Services;

use Document\Domain\Entities\DocumentEntity;
use Document\Domain\Exceptions\DocumentNotFoundException;
use Document\Domain\Repositories\DocumentRepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Domain\Services
 */
class ReadDocumentService
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
     * @param Id $id 
     * @param Id|UserEntity $user 
     * @return DocumentEntity 
     * @throws DocumentNotFoundException 
     */
    public function findDocumentOrFail(
        Id $id,
        Id|UserEntity $user
    ) {
        $document = $this->repo->ofId($id);

        if (null === $document || !$document->isAuthoredBy($user)) {
            throw new DocumentNotFoundException($id);
        }

        return $document;
    }
}
