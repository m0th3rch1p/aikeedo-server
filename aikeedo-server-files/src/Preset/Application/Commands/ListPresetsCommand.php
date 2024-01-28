<?php

declare(strict_types=1);

namespace Preset\Application\Commands;

use Preset\Application\CommandHandlers\ListPresetsCommandHandler;
use Preset\Domain\ValueObjects\SortParameter;
use Shared\Domain\ValueObjects\CursorDirection;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\MaxResults;
use Shared\Domain\ValueObjects\SortDirection;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Preset\Application\Commands */
#[Handler(ListPresetsCommandHandler::class)]
class ListPresetsCommand extends CountPresetsCommand
{
    public ?SortParameter $sortParameter = null;
    public SortDirection $sortDirection = SortDirection::DESC;
    public ?Id $cursor = null;
    public ?MaxResults $maxResults = null;
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
     * @return ListPresetsCommand 
     */
    public function setCursor(string $id, string $dir = 'starting_after'): self
    {
        $this->cursor = new Id($id);
        $this->cursorDirection = CursorDirection::from($dir);

        return $this;
    }

    /**
     * @param int $limit 
     * @return ListPresetsCommand 
     */
    public function setLimit(int $limit): self
    {
        $this->maxResults = new MaxResults($limit);

        return $this;
    }
}
