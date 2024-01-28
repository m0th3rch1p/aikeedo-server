<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\UseCreditCommandHandler;
use Billing\Domain\ValueObjects\Usage;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

#[Handler(UseCreditCommandHandler::class)]
class UseCreditCommand
{
    public readonly array $usages;

    public function __construct(
        public readonly UserEntity $user,
        Usage ...$usages
    ) {
        $this->usages = $usages;
    }
}
