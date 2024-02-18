<?php

declare(strict_types=1);

namespace Category\Domain\Repositories;

use Category\Domain\Entities\CategoryEntity;
use Category\Domain\ValueObjects\SortParameter;
use Shared\Domain\Repositories\RepositoryInterface;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\SortDirection;
use Traversable;

/** @package Category\Domain\Repositories */
interface CategoryRepositoryInterface extends RepositoryInterface
{
    /**
     * @param CategoryEntity $category 
     * @return static 
     */
    public function add(CategoryEntity $category): static;

    /**
     * @param CategoryEntity $category 
     * @return static 
     */
    public function remove(CategoryEntity $category): static;

    /**
     * @param Id $id 
     * @return null|CategoryEntity 
     */
    public function ofId(Id $id): ?CategoryEntity;

    /**
     * @param SortDirection $dir 
     * @param null|SortParameter $param 
     * @return static 
     */
    public function sort(
        SortDirection $dir,
        ?SortParameter $param = null
    ): static;

    /**
     * @param CategoryEntity $cursor 
     * @return Traversable<int,CategoryEntity> 
     */
    public function startingAfter(CategoryEntity $cursor): Traversable;

    /**
     * @param CategoryEntity $cursor 
     * @return Traversable<int,CategoryEntity> 
     */
    public function endingBefore(CategoryEntity $cursor): Traversable;
}
