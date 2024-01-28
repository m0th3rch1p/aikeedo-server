<?php

declare(strict_types=1);

namespace Category\Infrastructure;

use Application;
use Category\Domain\Repositories\CategoryRepositoryInterface;
use Category\Infrastructure\Repositories\DoctrineOrm\CategoryRepository;
use Shared\Infrastructure\BootstrapperInterface;

/** @package Category\Infrastructure */
class CategoryModuleBootstrapper implements BootstrapperInterface
{
    /**
     * @param Application $app 
     * @return void 
     */
    public function __construct(
        private Application $app
    ) {
    }

    /** @inheritDoc */
    public function bootstrap(): void
    {
        // Register repository implementations
        $this->app->set(
            CategoryRepositoryInterface::class,
            CategoryRepository::class
        );
    }
}
