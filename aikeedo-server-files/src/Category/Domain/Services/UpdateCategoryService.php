<?php

declare(strict_types=1);

namespace Category\Domain\Services;

use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Events\CategoryUpdatedEvent;
use Category\Domain\Repositories\CategoryRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/** @package Category\Domain\Services */
class UpdateCategoryService extends ReadCategoryService
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
    public function updateCategory(CategoryEntity $category): void
    {
        // Call the pre update hooks
        $category->preUpdate();

        // Update the category in the repository
        $this->repo->flush();

        // Dispatch the category updated event
        $event = new CategoryUpdatedEvent($category);
        $this->dispatcher->dispatch($event);
    }
}
