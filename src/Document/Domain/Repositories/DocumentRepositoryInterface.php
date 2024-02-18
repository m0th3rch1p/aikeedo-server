<?php

declare(strict_types=1);

namespace Document\Domain\Repositories;

use Document\Domain\Entities\DocumentEntity;
use Document\Domain\ValueObjects\SortParameter;
use Iterator;
use Shared\Domain\Repositories\RepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use User\Domain\Entities\UserEntity;

/**
 * @package Document\Domain\Repositories
 */
interface DocumentRepositoryInterface extends RepositoryInterface
{
    /**
     * Add new entityt to the repository
     *
     * @param DocumentEntity $document
     * @return DocumentRepositoryInterface
     */
    public function add(DocumentEntity $document): self;

    /**
     * Remove the entity from the repository
     *
     * @param DocumentEntity $document
     * @return DocumentRepositoryInterface
     */
    public function remove(DocumentEntity $document): self;

    /**
     * Find entity by id
     *
     * @param Id $id
     * @return null|DocumentEntity
     */
    public function ofId(Id $id): ?DocumentEntity;

    /**
     * @param Id|UserEntity $user 
     * @return DocumentRepositoryInterface 
     */
    public function filterByUser(Id|UserEntity $user): self;

    /**
     * @param string $terms 
     * @return DocumentRepositoryInterface 
     */
    public function search(string $terms): self;

    /**
     * @param SortDirection $dir
     * @param null|SortParameter $sortParameter
     * @return static
     */
    public function sort(SortDirection $dir, ?SortParameter $sortParameter = null): static;

    /**
     * @param DocumentEntity $cursor
     * @return Iterator<DocumentEntity>
     */
    public function startingAfter(DocumentEntity $cursor): Iterator;

    /**
     * @param DocumentEntity $cursor
     * @return Iterator<DocumentEntity>
     */
    public function endingBefore(DocumentEntity $cursor): Iterator;
}
