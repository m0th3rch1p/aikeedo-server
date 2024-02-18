<?php

declare(strict_types=1);

namespace Billing\Application\Commands;

use Billing\Application\CommandHandlers\ReadSubscriptionCommandHandler;
use Billing\Domain\ValueObjects\ExternalId;
use Billing\Domain\ValueObjects\PaymentGateway;
use Shared\Domain\ValueObjects\Id;
use Shared\Infrastructure\CommandBus\Attributes\Handler;

/** @package Billing\Application\Commands */
#[Handler(ReadSubscriptionCommandHandler::class)]
class ReadSubscriptionCommand
{
    public ?Id $id = null;
    public ?PaymentGateway $gateway = null;
    public ?ExternalId $externalId = null;

    /** @return void  */
    private function __construct()
    {
    }

    /**
     * @param string $gateway 
     * @param string $externalId 
     * @return ReadSubscriptionCommand 
     */
    public static function createByExternalId(
        string $gateway,
        string $externalId,
    ): ReadSubscriptionCommand {
        $cmd = new self;
        $cmd->externalId = new ExternalId($externalId);
        $cmd->gateway = new PaymentGateway($gateway);

        return $cmd;
    }

    /**
     * @param string $id 
     * @return ReadSubscriptionCommand 
     */
    public static function createById(string $id): ReadSubscriptionCommand
    {
        $cmd = new self;
        $cmd->id = new Id($id);

        return $cmd;
    }
}
