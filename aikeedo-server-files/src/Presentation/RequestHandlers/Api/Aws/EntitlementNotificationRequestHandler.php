<?php

namespace Presentation\RequestHandlers\Api\Aws;

use Aws\Infrastructure\Services\EntitlementService;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use PDepend\Util\Log;
use Presentation\Response\EmptyResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
#[Route(path: '/entitlement/webhook', method: RequestMethod::POST)]
class EntitlementNotificationRequestHandler extends AwsApi implements
    RequestHandlerInterface
{
    public function __construct(private EntitlementService $entitlementService)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // TODO: Implement handle() method.
        $data = json_decode($request->getBody(), true);

        switch ($data['Type']) {
            case 'SubscriptionConfirmation':
                Log::debug("Subscription Confirmation Test Working!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                break;
            case 'EntitlementNotification':
                $results = $this->entitlementService->getAllEntitlements();
                foreach ($results['Entitlements'] as $entitlement) {
                    switch ($entitlement['Status']) {
                        case 'ACTIVE':
                            // Handle new or upgraded entitlement
                            break;
                        case 'PENDING':
                            // Handle pending entitlement (usually renewal)
                            break;
                        case 'EXPIRED':
                            // Handle expired entitlement
                            break;
                        case 'SUSPENDED':
                            // Handle suspended entitlement
                            break;
                        case 'TERMINATED':
                            // Handle terminated entitlement
                            break;
                        case 'CANCELLED':
                            // Handle cancelled entitlement
                            break;
                    }
                }
                Log::debug('Entitlement Subscription Notification');
                break;
            default:
                Log::debug("Message type not handled: ${$data['type']}");
                break;
        }
        return new EmptyResponse();
    }
}