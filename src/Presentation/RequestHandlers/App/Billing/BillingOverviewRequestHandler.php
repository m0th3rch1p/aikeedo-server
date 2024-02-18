<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App\Billing;

use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Api\SubscriptionResource;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use User\Domain\Entities\UserEntity;

/** @package Presentation\RequestHandlers\App\Billing */
#[Route(path: '/[overview]?', method: RequestMethod::GET)]
class BillingOverviewRequestHandler extends BillingView implements
    RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);
        $subscription = $user->getActiveSubscription();

        $packs = [];
        foreach ($user->getTokenPacks() as $pack) {
            $packs[] = new SubscriptionResource($pack);
        }

        return new ViewResponse(
            '/templates/app/billing/overview.twig',
            [
                'subscription' => $subscription
                    ? new SubscriptionResource($subscription)
                    : null,
                'packs' => $packs
            ]
        );
    }
}
