<?php

declare(strict_types=1);

namespace Category\Application\CommandHandlers;

use Category\Application\Commands\CountCategoriesCommand;
use Category\Domain\Repositories\CategoryRepositoryInterface;

/** @package Category\Application\CommandHandlers */
class CountCategoriesCommandHandler
{
    /**
     * @param CategoryRepositoryInterface $repo 
     * @return void 
     */
    public function __construct(
        private CategoryRepositoryInterface $repo,
    ) {
    }

    /**
     * @param CountCategoriesCommand $cmd 
     * @return int 
     */
    public function handle(CountCategoriesCommand $cmd): int
    {
        $categories = $this->repo;

        return $categories->count();
    }
}
