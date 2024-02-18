<?php

declare(strict_types=1);

namespace Aws\Infrastructure;

use Application;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Aws\Domain\Repositories\AwsUsageRepositoryInterface;
use Aws\Infrastructure\Repositories\DoctrineOrm\AwsRepository;
use Aws\Infrastructure\Repositories\DoctrineOrm\AwsUsageRepository;
use Aws\Infrastructure\Services\EntitlementService;
use Shared\Infrastructure\BootstrapperInterface;

/**
 * @package Aws\Infrastructure
 */
class AwsModuleBootstrapper implements BootstrapperInterface
{
    /**
     * @param Application $app
     * @return void
     */
    public function __construct(
        private Application $app
    ) {
    }

    /**
     * @inheritDoc
     */
    public function bootstrap(): void
    {
        // Register repository implementations
        $this->app->set(
            AwsRepositoryInterface::class,
            AwsRepository::class
        );

        $this->app->set(AwsUsageRepositoryInterface::class, AwsUsageRepository::class);
    }
}
