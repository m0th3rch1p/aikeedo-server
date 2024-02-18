<?php

declare(strict_types=1);

use Easy\Container\Container;
use Psr\Container\ContainerInterface;
use Shared\Infrastructure\BootstrapperInterface;
use Shared\Infrastructure\ServiceProviderInterface;

/**
 * Bootstraps the application and the container.
 * Returns the container instance.
 * 
 * @return ContainerInterface
 */

// Make everything relative to the application root directory.
chdir(dirname(__DIR__));

// Configure class autoloading
require __DIR__ . '/autoload.php';

/** @var Container $container */
$container = require 'container.php';
//$container->get(\Aws\Infrastructure\Services\EntitlementSnsService::class);
//$container->get(\Aws\Infrastructure\Services\SubscriptionSnsService::class);

/** @var (ServiceProviderInterface|string)[] $providers */
$providers = $container->get('providers');

/** @var (BootstrapperInterface|string)[] $bootstrappers */
$bootstrappers = $container->get('bootstrappers');

$app = new Application($container, (bool) env('DEBUG', true));

$app->addServiceProvider(...$providers)
    ->addBootstrapper(...$bootstrappers)
    ->boot();

return $container;
