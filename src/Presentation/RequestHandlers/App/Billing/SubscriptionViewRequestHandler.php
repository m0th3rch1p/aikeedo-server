<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\App\Billing;

use Billing\Domain\ValueObjects\Status;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Resources\Api\SubscriptionResource;
use Presentation\Response\RedirectResponse;
use Presentation\Response\ViewResponse;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Shared\Domain\ValueObjects\Id;
use User\Domain\Entities\UserEntity;
use User\Domain\Exceptions\SubscriptionNotFoundException;

#[Route(path: '/subscriptions/[uuid:id]', method: RequestMethod::GET)]
class SubscriptionViewRequestHandler extends BillingView implements
    RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = $request->getAttribute('id');

        /** @var UserEntity */
        $user = $request->getAttribute(UserEntity::class);

        try {
            $sub = $user->findSubscription(new Id($id));
        } catch (SubscriptionNotFoundException $th) {
            return new RedirectResponse('/app/billing');
        }

        if ($sub->getStatus() != Status::ACTIVE) {
            return new RedirectResponse('/app/billing');
        }

        return new ViewResponse(
            '/templates/app/billing/subscription.twig',
            [
                'subscription' => new SubscriptionResource($sub)
            ]
        );
    }
}
