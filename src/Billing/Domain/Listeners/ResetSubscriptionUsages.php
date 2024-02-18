<?php

declare(strict_types=1);

namespace Billing\Domain\Listeners;

use Billing\Application\Commands\ListSubscriptionsCommand;
use Billing\Application\Commands\ReadSubscriptionCommand;
use Billing\Application\Commands\ResetUsageCommand;
use Billing\Domain\Entities\SubscriptionEntity;
use Billing\Domain\ValueObjects\Status;
use Cron\Domain\Events\CronEvent;
use Easy\Container\Attributes\Inject;
use Option\Application\Commands\SaveOptionCommand;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Throwable;
use Traversable;

class ResetSubscriptionUsages
{
    public function __construct(
        private Dispatcher $dispatcher,

        #[Inject('option.cron.reset_subscriptions.cursor_id')]
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

        $cmd->setLimit(2);

        /** @var Traversable<SubscriptionEntity> */
        $subs = $this->dispatcher->dispatch($cmd);

        $newCursor = null;
        foreach ($subs as $sub) {
            $newCursor = $sub;

            $cmd = new ResetUsageCommand($sub);
            $this->dispatcher->dispatch($cmd);
        }

        // Save new cursor
        $cmd = new SaveOptionCommand(
            'cron',
            json_encode([
                'reset_subscriptions' => [
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
