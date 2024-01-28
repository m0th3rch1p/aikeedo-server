<?php

declare(strict_types=1);

namespace Billing\Domain\Listeners;

use Billing\Application\Commands\CancelSubscriptionCommand;
use Billing\Application\Commands\ListSubscriptionsCommand;
use Billing\Application\Commands\ReadSubscriptionCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\Repositories\SubscriptionRepositoryInterface;
use Billing\Domain\ValueObjects\Status;
use Cron\Domain\Events\CronEvent;
use Easy\Container\Attributes\Inject;
use Option\Application\Commands\SaveOptionCommand;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Throwable;
use Traversable;

class CancelExpiredSubscriptions
{
    public function __construct(
        private Dispatcher $dispatcher,
        private SubscriptionRepositoryInterface $repo,

        #[Inject('option.cron.cancel_expired_subscriptions.cursor_id')]
        private ?string $cursorId = null,
    ) {
    }

    public function __invoke(CronEvent $event)
    {
        $cursor = $this->getCursor();

        $cmd = new ListSubscriptionsCommand();
        $cmd->status = Status::ACTIVE;

        if ($cursor) {
            $cmd->setCursor((string) $cursor->getId()->getValue());
        }

        $cmd->setLimit(20);

        /** @var Traversable<SubscriptionEntity> */
        $subs = $this->dispatcher->dispatch($cmd);

        $newCursor = null;
        foreach ($subs as $sub) {
            $newCursor = $sub;

            if (!$sub->isExpired()) {
                continue;
            }

            if (!$sub->getUser()->getActiveSubscription()) {
                $sub->cancel();
                $this->repo->flush();
                continue;
            }

            $cmd = new CancelSubscriptionCommand($sub->getUser());
            $this->dispatcher->dispatch($cmd);
        }

        // Save new cursor
        $cmd = new SaveOptionCommand(
            'cron',
            json_encode([
                'cancel_expired_subscriptions' => [
                    'cursor_id' => $newCursor ? $newCursor->getId()->getValue() : ''
                ]
            ])
        );

        $this->dispatcher->dispatch($cmd);
    }

    private function getCursor(): ?SubscriptionEntity
    {
        if (!$this->cursorId) {
            return null;
        }

        try {
            $cmd = ReadSubscriptionCommand::createById($this->cursorId);
            $sub = $this->dispatcher->dispatch($cmd);
        } catch (Throwable $th) {
            return null;
        }

        return $sub;
    }
}
