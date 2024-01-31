<?php

declare(strict_types=1);

namespace Aws\Domain\Repositories;

use Aws\Domain\Entities\AwsEntity;
use Aws\Domain\ValueObjects\SortParameter;
use Iterator;
use Shared\Domain\Repositories\RepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Domain\ValueObjects\StringValue;

/**
 * @package Aws\Domain\Repositories
 */
interface AwsRepositoryInterface extends RepositoryInterface
{
    /**
     * Add new entityt to the repository
     *
     * @param AwsEntity $aws
     * @return AwsRepositoryInterface
     */
    public function add(AwsEntity $aws): self;

    /**
     * Remove the entity from the repository
     *
     * @param AwsEntity $aws
     * @return AwsRepositoryInterface
     */
    public function remove(AwsEntity $aws): self;

    /**
     * Find entity by id
     *
     * @param Id $id
     * @return null|AwsEntity
     */
    public function ofId(Id $id): ?AwsEntity;

    public function ofCustomerId(string $customerId): ?AwsEntity;

    public function fetchAll ();
    /**
     * @param SortDirection $dir
     * @param null|SortParameter $sortParameter
     * @return static
     */
    public function sort(SortDirection $dir, ?SortParameter $sortParameter = null): static;

    /**
     * @param AwsEntity $cursor
     * @return Iterator<AwsEntity>
     */
    public function startingAfter(AwsEntity $cursor): Iterator;

    /**
     * @param AwsEntity $cursor
     * @return Iterator<AwsEntity>
     */
    public function endingBefore(AwsEntity $cursor): Iterator;
}
