<?php

declare(strict_types=1);

namespace Shared\Infrastructure\Providers;

use Application;
use Laminas\Diactoros\RequestFactory;
use Laminas\Diactoros\ResponseFactory;
use Laminas\Diactoros\ServerRequestFactory;
use Laminas\Diactoros\StreamFactory;
use Laminas\Diactoros\UploadedFileFactory;
use Laminas\Diactoros\UriFactory;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ServerRequestFactoryInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Psr\Http\Message\UploadedFileFactoryInterface;
use Psr\Http\Message\UriFactoryInterface;
use Shared\Infrastructure\ServiceProviderInterface;

/** @package Shared\Infrastructure\Providers */
class HttpFactoryServiceProvider implements ServiceProviderInterface
{
    /**
     * @inheritDoc
     */
    public function register(Application $app): void
    {
        $app
            ->set(RequestFactoryInterface::class, RequestFactory::class)
            ->set(ResponseFactoryInterface::class, ResponseFactory::class)
            ->set(ServerRequestFactoryInterface::class, ServerRequestFactory::class)
            ->set(StreamFactoryInterface::class, StreamFactory::class)
            ->set(UploadedFileFactoryInterface::class, UploadedFileFactory::class)
            ->set(UriFactoryInterface::class, UriFactory::class);
    }
}
