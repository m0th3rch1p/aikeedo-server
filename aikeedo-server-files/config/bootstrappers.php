<?php

declare(strict_types=1);

use Ai\Infrastruture\AiModuleBootstrapper;
use Category\Infrastructure\CategoryModuleBootstrapper;
use Document\Infrastructure\DocumentModuleBootstrapper;
use Billing\Infrastructure\BillingModuleBootstrapper;
use Option\Infrastructure\OptionModuleBootstrapper;
use Preset\Infrastructure\PresetModuleBootstrapper;
use Shared\Infrastructure\Bootstrappers\ConsoleBootstrapper;
use Shared\Infrastructure\Bootstrappers\DoctrineBootstrapper;
use Shared\Infrastructure\Bootstrappers\MailerBootstrapper;
use Shared\Infrastructure\Bootstrappers\RoutingBootstrapper;
use User\Infrastructure\UserModuleBootstrapper;

return [
    DoctrineBootstrapper::class,

    OptionModuleBootstrapper::class,
    UserModuleBootstrapper::class,
    CategoryModuleBootstrapper::class,
    PresetModuleBootstrapper::class,
    BillingModuleBootstrapper::class,
    DocumentModuleBootstrapper::class,
    AiModuleBootstrapper::class,

    ConsoleBootstrapper::class,
    RoutingBootstrapper::class,
    MailerBootstrapper::class,
];
