<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\ListSubscriptionsCommandHandler;
use Shared\Domain\ValueObjects\CursorDirection;
use Shared\Domain\ValueObjects\Id;
use Shared\Domain\ValueObjects\MaxResults;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Billing\Application\Commands */
#[Handler(ListSubscriptionsCommandHandler::class)]
class ListSubscriptionsCommand extends CountSubscriptionsCommand
{
    public ?Id $cursor = null;
    public ?MaxResults $maxResults;
    public CursorDirection $cursorDirection = CursorDirection::STARTING_AFTER;

    /** @return void  */
    public function __construct()
    {
        $this->maxResults = new MaxResults(MaxResults::DEFAULT);
    }

    /**
     * @param string $id 
     * @param string $dir 
     * @return ListSubscriptionsCommand 
     */
    public function setCursor(string $id, string $dir = 'starting_after'): self
    {
        $this->cursor = new Id($id);
        $this->cursorDirection = CursorDirection::from($dir);

        return $this;
    }

    /**
     * @param int $limit 
     * @return ListSubscriptionsCommand 
     */
    public function setLimit(int $limit): self
    {
        $this->maxResults = new MaxResults($limit);

        return $this;
    }
}
