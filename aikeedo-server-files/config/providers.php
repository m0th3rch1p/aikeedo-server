<?php

declare(strict_types=1);

use Shared\Infrastructure\Providers\CacheServiceProvider;
use Shared\Infrastructure\Providers\EventServiceProvider;
use Shared\Infrastructure\Providers\HttpClientServiceProvider;
use Shared\Infrastructure\Providers\HttpFactoryServiceProvider;
use Shared\Infrastructure\Providers\HttpServiceProvider;
use Shared\Infrastructure\Providers\LoggerServiceProvider;
use Shared\Infrastructure\Providers\ViewEngineProvider;

return [
    /** Define implementations for logger interfaces (PSR-3) */
    LoggerServiceProvider::class,

    /** Define implementations for cache interfaces (PSR-6, PSR-16)  */
//    CacheServiceProvider::class,

    /** Define implementations for the event dispatcher interfaces (PSR-14) */
    EventServiceProvider::class,

    /** Define implementations for HTTP factories (PSR-17) */
    HttpFactoryServiceProvider::class,

    /** Define implementation for HTTP Client [PSR-18] */
    HttpClientServiceProvider::class,

    HttpServiceProvider::class,
    ViewEngineProvider::class,


];
