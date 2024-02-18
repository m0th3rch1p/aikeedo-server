<?php

declare(strict_types=1);

namespace Category\Application\CommandHandlers;

use Category\Application\Commands\UpdateCategoryCommand;
use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Category\Domain\Services\UpdateCategoryService;

/** @package Category\Application\CommandHandlers */
class UpdateCategoryCommandHandler
{
    /**
     * @param UpdateCategoryService $service 
     * @return void 
     */
    public function __construct(
        private UpdateCategoryService $service
    ) {
    }

    /**
     * @param UpdateCategoryCommand $cmd 
     * @return CategoryEntity 
     * @throws CategoryNotFoundException 
     */
    public function handle(UpdateCategoryCommand $cmd): CategoryEntity
    {
        $category = $this->service->findCategoryOrFail($cmd->id);

        if ($cmd->title) {
            $category->setTitle($cmd->title);
        }

        $this->service->updateCategory($category);

        return $category;
    }
}
