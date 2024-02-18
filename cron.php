<?php

declare(strict_types=1);

use Cron\Domain\Events\CronEvent;
use Psr\Container\ContainerInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

// Application start timestamp
define('APP_START', microtime(true));

/** @var ContainerInterface $container */
$container = include __DIR__ . '/bootstrap/app.php';

$dispatcher = $container->get(EventDispatcherInterface::class);
$dispatcher->dispatch(new CronEvent());
