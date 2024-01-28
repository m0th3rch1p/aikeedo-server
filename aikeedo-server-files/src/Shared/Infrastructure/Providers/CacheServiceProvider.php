<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Providers;

use Application;
use Easy\Container\Attributes\Inject;
use Psr\Cache\CacheItemPoolInterface;
use Psr\SimpleCache\CacheInterface;
use Shared\Infrastructure\ServiceProviderInterface;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Psr16Cache;

/** @package Shared\Infrastructure\Providers */
class CacheServiceProvider implements ServiceProviderInterface
{
    /**
     * @param string $cacheDir
     * @return void
     */
    public function __construct(
        #[Inject('config.dirs.cache')]
        private string $cacheDir
    ) {
    }

    /**
     * @inheritDoc
     */
    public function register(Application $app): void
    {
        $adapter = new FilesystemAdapter(directory: $this->cacheDir);

        $app
            /**
             * FilesystemAdapter is a concrete implementation of
             * CacheItemPoolInterface. All of the its constructor arguments are
             * optional. Default cache location is system's temp directory.
             */
            ->set(CacheItemPoolInterface::class, $adapter)

            /**
             * Psr16Cache is a concrete implementation of CacheInterface. It
             * wraps a PSR-6 cache pool and provides a PSR-16 implementation
             * that can be used to store and retrieve values from the cache.
             *
             * Psr16Cache contructor requires a PSR-6 cache pool as its only
             * argument. We are using FilesystemAdapter as our PSR-6 cache pool
             * implementation (defined above).
             */
            ->set(CacheInterface::class, Psr16Cache::class);
    }
}
