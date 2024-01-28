<?php

namespace Aws\Application\MessageHandlers;

use Aws\Application\Commands\ReadByCustomerIdAwsCommand;
use Aws\Application\Messages\EntitlementMessage;
use Billing\Application\Commands\ActivateSubscriptionCommand;
use Billing\Application\Commands\CancelSubscriptionCommand;
use Billing\Application\Commands\CreateSubscriptionCommand;
use Billing\Application\Commands\ReadPlanByTitleCommand;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class EntitlementMessageHandler
{
    public function __construct(private Dispatcher $dispatcher)
    {
    }

    /**
     * @throws NoHandlerFoundException
     */
    public function __invoke (EntitlementMessage $message) {
        $customerIdentifier = $message->getCustomerIdentifier();
        $productCode = $message->getProductCode();
        $entitlementStatus = $message->getEntitlementStatus();
        $effectiveDate = $message->getEffectiveDate();

        //Get AwsCustomer
        $awsCmd = new ReadByCustomerIdAwsCommand($customerIdentifier);
        $aws = $this->dispatcher->dispatch($awsCmd);
        $user = $aws->getUser();

        // Handle subscription changes based on status
        switch ($entitlementStatus) {
            case 'Cancelled':
            case 'Expired':
                // Handle expired subscription
                // Handle cancelled subscription
                $cancelCmd = new CancelSubscriptionCommand($user);
                $this->dispatcher->dispatch($cancelCmd);
                break;
            case 'Renewed':
                //Get Plan Renewed
                $planCmd = new ReadPlanByTitleCommand($productCode);
                $plan = $this->dispatcher->dispatch($planCmd);

                // Handle renewed subscription
                $createSubCmd = new CreateSubscriptionCommand($user, $plan, 'aws');
                $sub = $this->dispatcher->dispatch($createSubCmd);

                $activateSubCmd = new ActivateSubscriptionCommand($user, $sub->getId());
                $this->dispatcher->dispatch($activateSubCmd);
                break;
        }
    }
}