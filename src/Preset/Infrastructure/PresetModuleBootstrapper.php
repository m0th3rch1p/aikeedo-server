<?php

declare(strict_types=1);

namespace Preset\Infrastructure;

use Application;
use Preset\Domain\Repositories\PresetRepositoryInterface;
use Preset\Infrastructure\DoctrineOrm\PresetRepository;
use Shared\Infrastructure\BootstrapperInterface;

/** @package Preset\Infrastructure */
class PresetModuleBootstrapper implements BootstrapperInterface
{
    /**
     * @param Application $app 
     * @return void 
     */
    public function __construct(
        private Application $app
    ) {
    }

    public function bootstrap(): void
    {
        // Register repository implementations
        $this->app->set(
            PresetRepositoryInterface::class,
            PresetRepository::class
        );
    }
}
