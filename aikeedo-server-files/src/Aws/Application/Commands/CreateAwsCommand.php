<?php

declare(strict_types=1);

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\CreateAwsCommandHandler;
use Shared\Domain\ValueObjects\StringValue;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/**
 * @package Aws\Application\Commands
 */
#[Handler(CreateAwsCommandHandler::class)]
class CreateAwsCommand
{
    public string $customerId;
    public string $dimension;

    /**
     * @param StringValue $customerId
     * @param StringValue $dimension
     */
    public function __construct(string $customerId, string $dimension)
    {
        $this->customerId = $customerId;
        $this->dimension = $dimension;
    }


}
