<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\ResetUsageCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Exceptions\SubscriptionNotFoundException;
use Billing\Domain\Services\ResetUsageService;

/** @package Billing\Application\CommandHandlers */
class ResetUsageCommandHandler
{
    /**
     * @param ResetUsageService $service 
     * @return void 
     */
    public function __construct(
        private ResetUsageService $service,
    ) {
    }

    /**
     * @param ResetUsageCommand $cmd 
     * @return SubscriptionEntity 
     * @throws SubscriptionNotFoundException 
     */
    public function handle(ResetUsageCommand $cmd): SubscriptionEntity
    {
        $sub = $cmd->id instanceof SubscriptionEntity
            ? $cmd->id
            : $this->service->findSubscriptionById($cmd->id);

        $this->service->resetUsage($sub);
        return $sub;
    }
}
