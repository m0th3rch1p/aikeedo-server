<?php

declare(strict_types=1);

namespace Presentation\RequestHandlers\Admin\Api;

use Easy\Container\Attributes\Inject;
use Easy\Http\Message\RequestMethod;
use Easy\Router\Attributes\Route;
use Presentation\Response\EmptyResponse;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\SimpleCache\CacheInterface;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

#[Route(path: '/cache', method: RequestMethod::DELETE)]
class ClearCacheRequestHandler extends AdminApi implements
    RequestHandlerInterface
{
    public function __construct(
        private CacheItemPoolInterface $cacheItemPool,
        private CacheInterface $cache,

        #[Inject('config.dirs.cache')]
        private string $cacheDir,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->cacheItemPool->clear();
        $this->cache->clear();
        $this->clearCacheDir();

        return new EmptyResponse();
    }

    private function clearCacheDir(): void
    {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $this->cacheDir,
                RecursiveDirectoryIterator::SKIP_DOTS
            ),

            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $path) {
            if ($path->isDir()) {
                rmdir($path->getPathname());
            } else {
                unlink($path->getPathname());
            }
        }
    }
}
