<?php

namespace Presentation\RequestHandlers\Api\Aws;

use Aws\Application\Commands\ReadByCustomerIdAwsCommand;
use Aws\Domain\Helpers\SubscriptionSnsHelper;
use Aws\Infrastructure\Services\EntitlementService;
use Aws\Infrastructure\Services\SubscriptionSnsService;
use Billing\Application\Commands\ActivateSubscriptionCommand;
use Billing\Application\Commands\CancelSubscriptionCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: "/subscription/webhook", method: RequestMethod::POST)]
class SubscriptionWebhookRequestHandler extends AwsApi implements  RequestHandlerInterface
{
    public function __construct(private LoggerInterface $logger, private Dispatcher $dispatcher)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface {
        $data = json_decode($request->getBody()->getContents());
        $this->logger->info('Subscription SNS Notification');
        $this->logger->debug(json_encode($data));
        switch ($data->Type) {
            case 'SubscriptionConfirmation':
                //Confirm Subscription To Arn
                $listResult = SubscriptionSnsService::listSubscriptions();
                $names = array_column($listResult->get('Subscriptions'), 'Endpoint');

                $found = in_array(SubscriptionSnsService::getHttpUrl(), $names);
                if (!$found) {
                    SubscriptionSnsService::confirmSubscription($data->Token, $data->TopicArn);
                    $this->logger->debug("subscription added");
                } else {
                    $this->logger->debug("subscription already done");
                }
                break;
            case 'SubscribeSuccess':
                $customerIdentifier = $data->Message->CustomerIdentifier;
                $awsCmd = new ReadByCustomerIdAwsCommand($customerIdentifier);
                $aws = $this->dispatcher->dispatch($awsCmd);

                $user = $aws->getUser();
                $subscription = $user->getSubscriptions()[0]->getId();

                $activateCmd = new ActivateSubscriptionCommand($user, $subscription);
                $this->dispatcher->dispatch($activateCmd);
                break;
            case 'SubscribeFail':
            case 'UnsubscribeSuccess':
                $customerIdentifier = $data->Message->CustomerIdentifier;
                $awsCmd = new ReadByCustomerIdAwsCommand($customerIdentifier);
                $aws = $this->dispatcher->dispatch($awsCmd);

                $user = $aws->getUser();
                $cancelCmd = new CancelSubscriptionCommand($user);
                $this->dispatcher->dispatch($cancelCmd);
                break;
            default:
                $this->logger->debug("Unhandled notification type");
        }
        //        $data = json_decode($request->getBody()->getContents());

        return new EmptyResponse();
    }
}