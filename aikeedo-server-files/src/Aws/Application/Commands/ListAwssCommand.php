<?php

declare(strict_types=1);

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\ListAwssCommandHandler;
use Aws\Domain\ValueObjects\SortParameter;
use Shared\Domain\ValueObjects\CursorDirection;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\MaxResults;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Aws\Application\Commands
 */
#[Handler(ListAwssCommandHandler::class)]
class ListAwssCommand extends CountAwssCommand
{
    public ?SortParameter $sortParameter = null;
    public SortDirection $sortDirection = SortDirection::DESC;
    public ?Id $cursor = null;
    public ?MaxResults $maxResults;
    public CursorDirection $cursorDirection = CursorDirection::STARTING_AFTER;

    /**
     * @return void
     */
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
     * @return ListAwssCommand
     */
    public function setCursor(string $id, string $dir = 'starting_after'): self
    {
        $this->cursor = new Id($id);
        $this->cursorDirection = CursorDirection::from($dir);

        return $this;
    }

    /**
     * @param int $limit
     * @return ListAwssCommand
     */
    public function setLimit(int $limit): self
    {
        $this->maxResults = new MaxResults($limit);

        return $this;
    }
}
