<?php

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\CreateAwsUsageCommandHandler;
use Aws\Domain\Entities\AwsEntity;
use Billing\Domain\ValueObjects\Usage;
use Shared\Infrastructure\CommandBus\Attributes\Handler;
use User\Domain\Entities\UserEntity;

#[Handler(CreateAwsUsageCommandHandler::class)]
class CreateAwsUsageCommand
{
    public UserEntity $user;
    public Usage $usage;
    /**
     * @param UserEntity $user
     * @param Usage $usage
     */
    public function __construct(UserEntity $user, Usage $usage)
    {
        $this->user = $user;
        $this->usage = $usage;
    }
}