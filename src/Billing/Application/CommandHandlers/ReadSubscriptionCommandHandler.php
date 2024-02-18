<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\ReadSubscriptionCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Exceptions\SubscriptionNotFoundException;
use Billing\Domain\Services\ReadSubscriptionService;
use InvalidArgumentException;

/** @package Billing\Application\CommandHandlers */
class ReadSubscriptionCommandHandler
{
    /**
     * @param ReadSubscriptionService $service 
     * @return void 
     */
    public function __construct(
        private ReadSubscriptionService $service,
    ) {
    }

    /**
     * @param ReadSubscriptionCommand $command 
     * @return SubscriptionEntity 
     * @throws SubscriptionNotFoundException 
     * @throws InvalidArgumentException 
     */
    public function handle(ReadSubscriptionCommand $command): SubscriptionEntity
    {
        if ($command->id) {
            return $this->service->findSubscriptionById($command->id);
        }

        if ($command->gateway && $command->externalId) {
            return $this->service->findSubscriptionByExternalId(
                $command->gateway,
                $command->externalId
            );
        }

        throw new InvalidArgumentException('Invalid command: ' . $command::class);
    }
}
