<?php

declare(strict_types=1);

namespace Document\Infrastructure;

use Application;
use Document\Domain\Repositories\DocumentRepositoryInterface;
use Document\Infrastructure\Repositories\DoctrineOrm\DocumentRepository;
use Shared\Infrastructure\BootstrapperInterface;

/**
 * @package Document\Infrastructure
 */
class DocumentModuleBootstrapper implements BootstrapperInterface
{
    /**
     * @param Application $app
     * @return void
     */
    public function __construct(
        private Application $app,
    ) {
    }

    /**
     * @inheritDoc
     */
    public function bootstrap(): void
    {
        // Register repository implementations
        $this->app->set(
            DocumentRepositoryInterface::class,
            DocumentRepository::class
        );
    }
}
