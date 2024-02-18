<?php

declare(strict_types=1);

namespace Shared\Domain\Repositories;

use Countable;
use Iterator;
use IteratorAggregate;
use Shared\Domain\ValueObjects\MaxResults;

/**
 * Base repository interface.
 *
 * This interface consist of the common methods which might be availabke in
 * actual repository interfaces. Repositories should not implement this
 * interface directly. Actualy repository interfaces may extend this interface.
 * 
 * @package Shared\Domain\Repositories
 */
interface RepositoryInterface extends IteratorAggregate, Countable
{
    /**
     * Returns the iterator of the collection after applying the filters
     *
     * @return Iterator
     */
    public function getIterator(): Iterator;

    /**
     * Return a slice of the collection
     *
     * @param int $start
     * @param int $size
     * @return RepositoryInterface
     */
    public function slice(int $start, int $size = 20): self;

    /**
     * Count entities in the filtered collection
     *
     * @return int
     */
    public function count(): int;

    /**
     * Flushes all changes to objects that have been queued up to now to the
     * database. This effectively synchronizes the in-memory state of managed
     * objects with permanent storage such as database.
     *
     * @return void
     */
    public function flush(): void;

    /**
     * @param MaxResults $maxResults 
     * @return static 
     */
    public function setMaxResults(MaxResults $maxResults): static;
}
