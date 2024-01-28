<?php

declare(strict_types=1);

namespace Ai\Infrastruture\Services;

use Ai\Domain\Services\AiServiceFactoryInterface;
use Ai\Domain\Services\AiServiceInterface;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use RuntimeException;
use Traversable;

/** @package Ai\Infrastruture\Services */
class AiServiceFactory implements AiServiceFactoryInterface
{
    /** @var array<int,class-string<AiServiceInterface>|AiServiceInterface> */
    private array $services = [];

    /**
     * @param ContainerInterface $container 
     * @return void 
     */
    public function __construct(
        private ContainerInterface $container
    ) {
    }

    /**
     * @inheritDoc
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     * @throws RuntimeException
     */
    public function list(string $name): Traversable
    {
        foreach ($this->services as $index => $service) {
            if (is_string($service)) {
                $service = $this->container->get($service);

                if (!($service instanceof AiServiceInterface)) {
                    throw new \RuntimeException(
                        sprintf(
                            'Service "%s" is not an instance of "%s".',
                            $service::class,
                            AiServiceInterface::class
                        )
                    );
                }

                $this->services[$index] = $service;
            }

            if ($service instanceof $name) {
                yield $service;
            }
        }
    }

    /**
     * @inheritDoc
     * @throws NotFoundExceptionInterface 
     * @throws ContainerExceptionInterface 
     * @throws RuntimeException 
     */
    public function create(
        string $name,
        ?string $model = null
    ): AiServiceInterface {
        foreach ($this->services as $index => $service) {
            if (is_string($service)) {
                $service = $this->container->get($service);

                if (!($service instanceof AiServiceInterface)) {
                    throw new \RuntimeException(
                        sprintf(
                            'Service "%s" is not an instance of "%s".',
                            $service::class,
                            AiServiceInterface::class
                        )
                    );
                }

                $this->services[$index] = $service;
            }

            if (!($service instanceof $name)) {
                continue;
            }

            if (!$model) {
                return $service;
            }

            if ($service->supportsModel($model)) {
                return $service;
            }
        }

        throw new \RuntimeException(
            sprintf(
                'No service found for model %s.',
                $model
            )
        );
    }

    /**
     * @param class-string<AiServiceInterface>|AiServiceInterface $service
     * @return AiServiceFactory 
     */
    public function register(string|AiServiceInterface $service): self
    {
        $this->services[] = $service;
        return $this;
    }
}
