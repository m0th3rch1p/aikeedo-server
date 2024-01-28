<?php

declare(strict_types=1);

namespace Category\Application\CommandHandlers;

use Category\Application\Commands\CreateCategoryCommand;
use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Services\CreateCategoryService;

/** @package Category\Application\CommandHandlers */
class CreateCategoryCommandHandler
{
    /**
     * @param CreateCategoryService $service 
     * @return void 
     */
    public function __construct(
        private CreateCategoryService $service
    ) {
    }

    /**
     * @param CreateCategoryCommand $cmd 
     * @return CategoryEntity 
     */
    public function handle(CreateCategoryCommand $cmd): CategoryEntity
    {
        $category = new CategoryEntity(
            title: $cmd->title
        );

        $this->service->createCategory($category);

        return $category;
    }
}
