<?php

declare(strict_types=1);

namespace Aws\Infrastructure;

use Application;
use Aws\Credentials\Credentials;
use Aws\Domain\Repositories\AwsRepositoryInterface;
use Aws\Domain\Repositories\AwsUsageRepositoryInterface;
use Aws\Infrastructure\Aws\Sns\services\EntitlementSnsService;
use Aws\Infrastructure\Aws\Sns\services\SubscriptionSnsService;
use Aws\Infrastructure\Aws\Sns\SnsFactory;
use Aws\Infrastructure\Repositories\DoctrineOrm\AwsRepository;
use Aws\Infrastructure\Repositories\DoctrineOrm\AwsUsageRepository;
use Aws\Sns\SnsClient;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
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
        private Application $app,
        private SnsFactory $factory
    ) {
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function registerSnsServices (): void
    {
        $credentials = new Credentials(env('AWS_KEY'), env('AWS_SECRET'));
        $client = new SnsClient([
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => $credentials
        ]);

        $this->app->set(SnsClient::class, $client);
        $this->factory
            ->register(SubscriptionSnsService::class)
            ->register(EntitlementSnsService::class);
        $this->factory->makeSubscriptions();
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
        try {
            $this->registerSnsServices();
        } catch (NotFoundExceptionInterface | ContainerExceptionInterface $e) {
            die($e);
        }
    }
}
