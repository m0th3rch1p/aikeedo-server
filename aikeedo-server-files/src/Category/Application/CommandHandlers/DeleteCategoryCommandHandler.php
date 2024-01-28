<?php

declare(strict_types=1);

namespace Category\Application\CommandHandlers;

use Category\Application\Commands\DeleteCategoryCommand;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Category\Domain\Services\DeleteCategoryService;

/** @package Category\Application\CommandHandlers */
class DeleteCategoryCommandHandler
{
    /**
     * @param DeleteCategoryService $service 
     * @return void 
     */
    public function __construct(
        private DeleteCategoryService $service
    ) {
    }

    /**
     * @param DeleteCategoryCommand $cmd 
     * @return void 
     * @throws CategoryNotFoundException 
     */
    public function handle(DeleteCategoryCommand $cmd): void
    {
        $category = $this->service->findCategoryOrFail($cmd->id);
        $this->service->deleteCategory($category);
    }
}
