<?php

declare(strict_types=1);

namespace User\Domain\Events;

use Easy\EventDispatcher\Attributes\Listener;
use User\Infrastructure\Listeners\SendVerificationEmail;
use User\Infrastructure\Listeners\SendWelcomeEmail;

/** @package User\Domain\Events */
#[Listener(SendWelcomeEmail::class)]
#[Listener(SendVerificationEmail::class)]
class UserCreatedEvent extends AbstractUserEvent
{
}
