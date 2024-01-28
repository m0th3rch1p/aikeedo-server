<?php

declare(strict_types=1);

namespace User\Infrastructure\Listeners;

use User\Domain\Events\UserCreatedEvent;
use User\Domain\Events\UserEmailUpdatedEvent;
use User\Infrastructure\Services\VerificationEmailService;

class SendVerificationEmail
{
    public function __construct(
        private VerificationEmailService $service,
    ) {
    }

    public function __invoke(UserCreatedEvent|UserEmailUpdatedEvent $event)
    {
        $user = $event->user;
        $this->service->send($user);
    }
}
