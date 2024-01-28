<?php

declare(strict_types=1);

namespace User\Application\Commands;

use Shared\Domain\ValueObjects\CursorDirection;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\MaxResults;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Application\CommandHandlers\ListUsersCommandHandler;
use User\Domain\ValueObjects\SortParameter;

/** @package User\Application\Commands */
#[Handler(ListUsersCommandHandler::class)]
class ListUsersCommand extends CountUsersCommand
{
    public ?SortParameter $sortParameter = null;
    public SortDirection $sortDirection = SortDirection::DESC;
    public ?Id $cursor = null;
    public ?MaxResults $maxResults;
    public CursorDirection $cursorDirection = CursorDirection::STARTING_AFTER;

    /** @return void  */
    public function __construct()
    {
        $this->maxResults = new MaxResults(MaxResults::DEFAULT);
    }

    /**
     * @param string $orderBy
     * @param string $dir
     * @return void
     */
    public function setOrderBy(string $orderBy, string $dir): void
    {
        $this->sortParameter =  SortParameter::from($orderBy);
        $this->sortDirection = SortDirection::from(strtoupper($dir));
    }

    /**
     * @param string $id
     * @param string $dir
     * @return ListUsersCommand
     */
    public function setCursor(string $id, string $dir = 'starting_after'): self
    {
        $this->cursor = new Id($id);
        $this->cursorDirection = CursorDirection::from($dir);

        return $this;
    }

    /**
     * @param int $limit
     * @return ListUsersCommand
     */
    public function setLimit(int $limit): self
    {
        $this->maxResults = new MaxResults($limit);

        return $this;
    }
}
