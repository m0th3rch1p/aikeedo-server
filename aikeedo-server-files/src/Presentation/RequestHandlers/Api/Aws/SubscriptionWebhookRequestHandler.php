<?php

namespace Presentation\RequestHandlers\Api\Aws;

use Aws\Domain\Helpers\SubscriptionSnsHelper;
use Aws\Infrastructure\Services\EntitlementService;
use Aws\Infrastructure\Services\SubscriptionSnsService;
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
    public function __construct(private LoggerInterface $logger, private EntitlementService $service, private Dispatcher $dispatcher)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface {
        $data = json_decode($request->getBody()->getContents());
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
        }
        //        $data = json_decode($request->getBody()->getContents());

        return new EmptyResponse();
    }
}