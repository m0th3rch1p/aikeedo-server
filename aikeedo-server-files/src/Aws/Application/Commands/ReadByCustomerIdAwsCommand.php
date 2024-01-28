<?php

namespace Aws\Application\Commands;

use Aws\Application\CommandHandlers\ReadByCustomerIdAwsCommandHandler;
use Shared\Domain\ValueObjects\StringValue;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

#[Handler(className: ReadByCustomerIdAwsCommandHandler::class)]
class ReadByCustomerIdAwsCommand
{
    public StringValue $customerId;

    /**
     * @param StringValue $customerId
     */
    public function __construct(StringValue $customerId)
    {
        $this->customerId = $customerId;
    }


}