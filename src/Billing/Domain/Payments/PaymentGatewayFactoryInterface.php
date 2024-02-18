<?php

declare(strict_types=1);

namespace Billing\Domain\Payments;

/** @package Billing\Domain\Payments */
interface PaymentGatewayFactoryInterface
{
    /**
     * @param string $gateway 
     * @return PaymentGatewayInterface 
     * @throws GatewayNotFoundException
     */
    public function create(string $gateway): PaymentGatewayInterface;

    /**
     * List all available gateways.
     *
     * @return array<int,PaymentGatewayInterface>
     */
    public function listAll(): array;
}
