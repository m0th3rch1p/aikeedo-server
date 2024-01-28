<?php

declare(strict_types=1);

namespace Billing\Infrastructure\Payments;

use Billing\Domain\Payments\GatewayNotFoundException;
use Billing\Domain\Payments\PaymentGatewayFactoryInterface;
use Billing\Domain\Payments\PaymentGatewayInterface;
use Psr\Container\ContainerInterface;

/** @package Billing\Infrastructure\Payments */
class PaymentGatewayFactory implements PaymentGatewayFactoryInterface
{
    /** @var array<int,class-string<PaymentGatewayInterface>|PaymentGatewayInterface> */
    private array $gateways = [];

    /**
     * @param ContainerInterface $container 
     * @return void 
     */
    public function __construct(private ContainerInterface $container)
    {
    }

    /** @inheritDoc  */
    public function listAll(): array
    {
        return $this->getResolvedGateways();
    }

    /** @inheritDoc */
    public function create(string $key): PaymentGatewayInterface
    {
        $gateways = $this->getResolvedGateways();

        foreach ($gateways as $gateway) {
            if ($gateway->getLookupKey() === $key) {
                return $gateway;
            }
        }

        throw new GatewayNotFoundException($key);
    }

    /**
     * @param class-string<PaymentGatewayInterface>|PaymentGatewayInterface $gateway 
     * @return PaymentGatewayFactory 
     */
    public function register(string|PaymentGatewayInterface $gateway): self
    {
        $this->gateways[] = $gateway;
        return $this;
    }

    /** @return array<int,PaymentGatewayInterface>  */
    private function getResolvedGateways(): array
    {
        $this->gateways = array_map(function ($gateway) {
            if (is_string($gateway)) {
                $gateway = $this->container->get($gateway);
            }

            if (!($gateway instanceof PaymentGatewayInterface)) {
                throw new \RuntimeException(
                    "Gateway {$gateway} is not an instance of " . PaymentGatewayInterface::class
                );
            }

            return $gateway;
        }, $this->gateways);

        return $this->gateways;
    }
}
