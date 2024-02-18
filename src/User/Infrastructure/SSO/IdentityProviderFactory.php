<?php

declare(strict_types=1);

namespace User\Infrastructure\SSO;

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use User\Infrastructure\SSO\Exceptions\IdentityProviderNotFoundException;

/** @package User\Infrastructure\SSO */
class IdentityProviderFactory implements IdentityProviderFactoryInterface
{
    private array $map = [];

    /**
     * @param ContainerInterface $container
     * @return void
     */
    public function __construct(
        private ContainerInterface $container,
    ) {
    }

    /**
     * @inheritDoc
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public function getIdentityProvider(
        string $platform
    ): IdentityProviderInterface {
        if (!isset($this->map[$platform])) {
            throw new IdentityProviderNotFoundException($platform);
        }

        $this->resolve();
        return $this->map[$platform];
    }

    /**
     * @inheritDoc
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public function listAll(): array
    {
        $this->resolve();
        return array_values($this->map);
    }

    /**
     * @param string $platform
     * @param class-string<IdentityProviderInterface>|IdentityProviderInterface $provider
     * @return IdentityProviderFactory
     */
    public function register(
        string $platform,
        string|IdentityProviderInterface $provider
    ): self {
        $this->map[$platform] = $provider;
        return $this;
    }

    /**
     * @return void
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    private function resolve(): void
    {
        foreach ($this->map as $platform => $value) {
            if (is_string($value)) {
                $this->map[$platform] = $this->container->get($value);
            }
        }
    }
}
