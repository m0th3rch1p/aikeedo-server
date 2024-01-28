<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\CountSubscriptionsCommand;
use Billing\Domain\Repositories\SubscriptionRepositoryInterface;

/** @package Billing\Application\CommandHandlers */
class CountSubscriptionsCommandHandler
{
    /**
     * @param SubscriptionRepositoryInterface $repo 
     * @return void 
     */
    public function __construct(
        private SubscriptionRepositoryInterface $repo
    ) {
    }

    /**
     * @param CountSubscriptionsCommand $cmd 
     * @return int 
     */
    public function handle(CountSubscriptionsCommand $cmd): int
    {
        $subs = $this->repo;

        if ($cmd->status) {
            $subs = $subs->filterByStatus($cmd->status);
        }

        return $subs->count();
    }
}
