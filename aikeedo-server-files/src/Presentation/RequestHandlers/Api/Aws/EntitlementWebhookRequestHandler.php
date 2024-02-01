<?php

namespace Presentation\RequestHandlers\Api\Aws;

use Aws\Application\Commands\ReadByCustomerIdAwsCommand;
use Aws\Infrastructure\Services\EntitlementService;
use Billing\Application\Commands\ActivateSubscriptionCommand;
use Billing\Application\Commands\CancelSubscriptionCommand;
use Billing\Application\Commands\CreateSubscriptionCommand;
use Billing\Application\Commands\ReadPlanCommand;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use PDepend\Util\Log;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: "/entitlement/webhook", method: RequestMethod::POST)]
class EntitlementWebhookRequestHandler extends AwsApi implements  RequestHandlerInterface
{
    public function __construct (private LoggerInterface $logger, private EntitlementService $service, private Dispatcher $dispatcher) {

    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $data = json_decode($request->getBody()->getContents());
        switch ($data->Type) {
            case 'SubscriptionConfirmation':
                $this->logger->info('Entitlement Subscription Confirmation Confirmed');
                $listResult = \Aws\Infrastructure\Services\EntitlementSnsService::listSubscriptions();
                $names = array_column($listResult->get('Subscriptions'), 'Endpoint');
                $found = in_array(\Aws\Infrastructure\Services\EntitlementSnsService::getHttpUrl(), $names);

                if (!$found) {
                    \Aws\Infrastructure\Services\EntitlementSnsService::confirmSubscription($data->Token, $data->TopicArn);
                }
                break;
            case 'EntitlementNotification':
                $this->logger->info('Entitlement Notification Confirmed');
                $this->logger->debug(json_encode($data));
                $results = $this->service->getAllEntitlements();

                foreach ($results->get('Entitlements') as $entitlement) {
                    //Fetch Aws Customer
                    $awsCmd = new ReadByCustomerIdAwsCommand($entitlement['CustomerIdentifier']);
                    $aws = $this->dispatcher->dispatch($awsCmd);
                    $user = $aws->getUser();

                    switch ($entitlement['Status']) {
                        case 'ACTIVE':
                            // Handle new or upgraded entitlement
                            //Fetch Plan
                            $planCmd = new ReadPlanCommand($entitlement['Dimension']);
                            $plan = $this->dispatcher->dispatch($planCmd);

                            $subCmd = new CreateSubscriptionCommand($user, $plan, 'aws');
                            $sub = $this->dispatcher->dispatch($subCmd);

                            $activateCmd = new ActivateSubscriptionCommand($user, $sub);
                            $this->dispatcher->dispatch($activateCmd);
                            break;
                        case 'PENDING':
                            // Handle pending entitlement (usually renewal)
                            //Fetch Plan
                            $planCmd = new ReadPlanCommand($entitlement['Dimension']);
                            $plan = $this->dispatcher->dispatch($planCmd);

                            $subCmd = new CreateSubscriptionCommand($user, $plan, 'aws');
                            $sub = $this->dispatcher->dispatch($subCmd);
                            break;
                        case 'EXPIRED':
                        case 'SUSPENDED':
                        case 'TERMINATED':
                        case 'CANCELLED':
                            // Handle expired entitlement
                            $subCmd = new CancelSubscriptionCommand($user);
                            $this->dispatcher->dispatch($subCmd);
                            break;
                    }
                }
                break;
            default:
                $this->logger->error('Entitlement Notification not handled');
                break;
        }

        return new EmptyResponse();
    }
}