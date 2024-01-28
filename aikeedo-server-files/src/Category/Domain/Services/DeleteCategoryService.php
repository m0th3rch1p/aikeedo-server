<?php

declare(strict_types=1);

namespace Category\Domain\Services;

use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Events\CategoryDeletedEvent;
use Category\Domain\Repositories\CategoryRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/** @package Category\Domain\Services */
class DeleteCategoryService extends ReadCategoryService
{
    /**
     * @param CategoryRepositoryInterface $repo 
     * @param EventDispatcherInterface $dispatcher 
     * @return void 
     */
    public function __construct(
        private CategoryRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher
    ) {
        parent::__construct($repo);
    }

    /**
     * @param CategoryEntity $category 
     * @return void 
     */
    public function deleteCategory(CategoryEntity $category): void
    {
        // Delete the category from the repository
        $this->repo
            ->remove($category)
            ->flush();

        // Dispatch the category deleted event
        $event = new CategoryDeletedEvent($category);
        $this->dispatcher->dispatch($event);
    }
}
