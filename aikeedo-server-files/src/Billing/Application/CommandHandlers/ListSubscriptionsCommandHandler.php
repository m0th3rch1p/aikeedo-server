<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\ListSubscriptionsCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Exceptions\SubscriptionNotFoundException;
use Billing\Domain\Repositories\SubscriptionRepositoryInterface;
use Billing\Domain\Services\ReadSubscriptionService;
use Shared\Domain\ValueObjects\CursorDirection;
use Traversable;

/** @package Billing\Application\CommandHandlers */
class ListSubscriptionsCommandHandler
{
    /**
     * @param SubscriptionRepositoryInterface $repo 
     * @param ReadSubscriptionService $service 
     * @return void 
     */
    public function __construct(
        private SubscriptionRepositoryInterface $repo,
        private ReadSubscriptionService $service,
    ) {
    }

    /**
     * @param ListSubscriptionsCommand $cmd 
     * @return Traversable<SubscriptionEntity> 
     * @throws SubscriptionNotFoundException 
     */
    public function handle(ListSubscriptionsCommand $cmd): Traversable
    {
        $cursor = $cmd->cursor
            ? $this->service->findSubscriptionById($cmd->cursor)
            : null;

        $subs = $this->repo;

        if ($cmd->status) {
            $subs = $subs->filterByStatus($cmd->status);
        }

        if ($cmd->maxResults) {
            $subs = $subs->setMaxResults($cmd->maxResults);
        }

        if ($cursor) {
            if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {
                return $subs = $subs->endingBefore($cursor);
            }

            return $subs->startingAfter($cursor);
        }

        return $subs;
    }
}
