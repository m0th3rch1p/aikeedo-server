<?php

declare(strict_types=1);

namespace Category\Domain\Services;

use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Events\CategoryCreatedEvent;
use Category\Domain\Repositories\CategoryRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/** @package Category\Domain\Services */
class CreateCategoryService
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
    }

    /**
     * @param CategoryEntity $category 
     * @return void 
     */
    public function createCategory(CategoryEntity $category): void
    {
        // Add entoty to repository
        $this->repo
            ->add($category)
            ->flush();

        // Dispatch the category created event
        $event = new CategoryCreatedEvent($category);
        $this->dispatcher->dispatch($event);
    }
}
