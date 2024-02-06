<?php

namespace Presentation\RequestHandlers\Api\Aws;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Aws\Infrastructure\Aws\Sns\EntitlementSnsService;
use Presentation\Response\EmptyResponse;
use Presentation\Response\RedirectResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Shared\Infrastructure\CommandBus\Dispatcher;

#[Route(path: "/entitlement/webhook", method: RequestMethod::POST)]
class EntitlementWebhookRequestHandler extends AwsApi implements  RequestHandlerInterface
{
    public function __construct (private LoggerInterface $logger, private Dispatcher $dispatcher) {

    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
//        $data = json_decode($request->getBody()->getContents());
//        $this->logger->info('Entitlement SNS Notification');
//        $this->logger->debug(json_encode($data));
//        switch ($data->Type) {
//            case 'SubscriptionConfirmation':
//                $this->entitlementSnsService->confirmSubscription($data->Token, $data->TopicArn);
//                break;
//            case 'EntitlementUpdated':
//                $this->logger->info('EntitlementUpdated');
//                $this->logger->debug(json_encode($data));
//
//                $customerId = $data->Message->CustomerIdentifier;
//                $entitlementResults = $this->service->getEntitlementByCustomerId($customerId);
//                $entitlements = $entitlementResults->get('Entitlements');
//
//                if (!count($entitlements)) {
//                    //Handle not active subscription
//                    return new RedirectResponse(uri: '/');
//                }
//
//                $awsCmd = new ReadByCustomerIdAwsCommand($customerId);
//                $aws = $this->dispatcher->dispatch($awsCmd);
//                $user = $aws->getUser();
//
//                $planCmd = new ReadPlanByTitleCommand($entitlements[0]['Dimension']);
//                $plan = $this->dispatcher->dispatch($planCmd);
//
//                $subscriptionCmd = new CreateSubscriptionCommand($user, $plan, 'aws');
//                $subscription = $this->dispatcher->dispatch($subscriptionCmd);
//
//                $activateSubCmd = new ActivateSubscriptionCommand($user, $subscription->getId());
//                $this->dispatcher->dispatch($activateSubCmd);
//                break;
//            default:
//                $this->logger->error('Entitlement Notification not handled');
//                break;
//        }
//
//        return new EmptyResponse();
    }
}