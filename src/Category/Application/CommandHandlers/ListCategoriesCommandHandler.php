<?php

declare(strict_types=1);

namespace Category\Application\CommandHandlers;

use Category\Application\Commands\ListCategoriesCommand;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Category\Domain\Repositories\CategoryRepositoryInterface;
use Category\Domain\Services\ReadCategoryService;
use Shared\Domain\ValueObjects\CursorDirection;
use Traversable;

/** @package Category\Application\CommandHandlers */
class ListCategoriesCommandHandler
{
    /**
     * @param CategoryRepositoryInterface $repo 
     * @param ReadCategoryService $service 
     * @return void 
     */
    public function __construct(
        private CategoryRepositoryInterface $repo,
        private ReadCategoryService $service
    ) {
    }

    /**
     * @param ListCategoriesCommand $cmd 
     * @return Traversable 
     * @throws CategoryNotFoundException 
     */
    public function handle(ListCategoriesCommand $cmd): Traversable
    {
        $cursor = $cmd->cursor
            ? $this->service->findCategoryOrFail($cmd->cursor)
            : null;

        $categories =  $this->repo
            ->sort($cmd->sortDirection, $cmd->sortParameter);

        if ($cmd->maxResults) {
            $categories = $categories->setMaxResults($cmd->maxResults);
        }

        if ($cursor) {
            if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {
                return $categories->endingBefore($cursor);
            }

            return $categories->startingAfter($cursor);
        }

        return $categories;
    }
}
