<?php

declare(strict_types=1);

namespace Billing\Application\CommandHandlers;

use Billing\Application\Commands\ActivateSubscriptionCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Payments\PaymentGatewayFactoryInterface;
use Billing\Domain\Services\ActivateSubscriptionService;
use Exception;
use User\Domain\Exceptions\SubscriptionNotFoundException;
use LogicException;
use Throwable;

/** @package Billing\Application\CommandHandlers */
class ActivateSubscriptionCommandHandler
{
    public function __construct(
        private PaymentGatewayFactoryInterface $factory,
        private ActivateSubscriptionService $service
    ) {
    }

    /**
     * @param ActivateSubscriptionCommand $cmd 
     * @return SubscriptionEntity 
     * @throws Exception 
     * @throws SubscriptionNotFoundException 
     * @throws LogicException 
     */
    public function handle(ActivateSubscriptionCommand $cmd): SubscriptionEntity
    {
        $current = $cmd->user->getActiveSubscription();
        $subscription = $cmd->user->findSubscription($cmd->subscription);

        if ($cmd->externalId) {
            $subscription->setExternalId($cmd->externalId);
        }

        if ($current && $current->getPaymentGateway()->value) {
            try {
                $gateway = $this->factory->create(
                    $current->getPaymentGateway()->value
                );

                $gateway->cancelSubscription($current);
            } catch (Throwable $th) {
                // Do nothing. 
                // Merchant should cancel subscription manually on 3rd the 
                // party gateway.
            }
        }

        $this->service->activateSubscription($subscription);

        return $subscription;
    }
}
