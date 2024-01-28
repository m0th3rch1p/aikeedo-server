<?php

declare(strict_types=1);

namespace Billing\Domain\Exceptions;

use Billing\Domain\ValueObjects\ExternalId;
use Billing\Domain\ValueObjects\PaymentGateway;
use Exception;
use Shared\Domain\ValueObjects\Id;
use Throwable;

/** @package Billing\Domain\Exceptions */
class SubscriptionNotFoundException extends Exception
{
    public readonly ?Id $id;
    public readonly ?PaymentGateway $gateway;
    public readonly ?ExternalId $externalId;

    /**
     * @param string $message 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return void 
     */
    private function __construct(
        string $message = '',
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $code, $previous);
    }

    /**
     * @param Id $id 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return SubscriptionNotFoundException 
     */
    public static function createWithId(
        Id $id,
        int $code = 0,
        ?Throwable $previous = null,
    ): self {
        $th = new self(
            sprintf(
                "Subscription with <%s> doesn't exists!",
                $id->getValue()
            ),
            $code,
            $previous
        );
        $th->id = $id;

        $th->gateway = null;
        $th->externalId = null;

        return $th;
    }

    /**
     * @param PaymentGateway $gateway 
     * @param ExternalId $externalId 
     * @param int $code 
     * @param null|Throwable $previous 
     * @return SubscriptionNotFoundException 
     */
    public static function createWithExternalId(
        PaymentGateway $gateway,
        ExternalId $externalId,
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        $th = new self(
            sprintf(
                "Subscription with  <%s:%s> doesn't exists!",
                $externalId->value ?: '',
                $gateway->value ?: ''
            ),
            $code,
            $previous
        );
        $th->id = null;

        $th->gateway = $gateway;
        $th->externalId = $externalId;

        return $th;
    }
}
