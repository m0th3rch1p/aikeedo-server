<?php

declare(strict_types=1);

namespace Category\Application\CommandHandlers;

use Category\Application\Commands\ReadCategoryCommand;
use Category\Domain\Entities\CategoryEntity;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Category\Domain\Services\ReadCategoryService;

/** @package Category\Application\CommandHandlers */
class ReadCategoryCommandHandler
{
    /**
     * @param ReadCategoryService $service 
     * @return void 
     */
    public function __construct(
        private ReadCategoryService $service
    ) {
    }

    /**
     * @param ReadCategoryCommand $cmd 
     * @return CategoryEntity 
     * @throws CategoryNotFoundException 
     */
    public function handle(ReadCategoryCommand $cmd): CategoryEntity
    {
        return $this->service->findCategoryOrFail($cmd->id);
    }
}
