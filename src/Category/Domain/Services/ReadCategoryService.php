<?php

declare(strict_types=1);

namespace Category\Domain\Services;

use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Category\Domain\Repositories\CategoryRepositoryInterface;
use Shared\Domain\ValueObjects\Id;

/** @package Category\Domain\Services */
class ReadCategoryService
{
    /**
     * @param CategoryRepositoryInterface $repo 
     * @return void 
     */
    public function __construct(
        private CategoryRepositoryInterface $repo
    ) {
    }

    /**
     * @param Id $id 
     * @return CategoryEntity 
     * @throws CategoryNotFoundException 
     */
    public function findCategoryOrFail(Id $id): CategoryEntity
    {
        $category = $this->repo->ofId($id);

        if (!$category) {
            throw new CategoryNotFoundException($id);
        }

        return $category;
    }
}
