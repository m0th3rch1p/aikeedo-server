<?php

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\ReadByCustomerIdAwsCommandHandler;
use Shared\Domain\ValueObjects\StringValue;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

#[Handler(className: ReadByCustomerIdAwsCommandHandler::class)]
class ReadByCustomerIdAwsCommand
{
    public string $customerId;

    /**
     * @param string $customerId
     */
    public function __construct(string $customerId)
    {
        $this->customerId = $customerId;
    }


}