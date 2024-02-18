<?php

declare(strict_types=1);

use Doctrine\DBAL\Tools\Console\Command\RunSqlCommand;
use Doctrine\ORM\Tools\Console\Command as ORMCommand;
use Doctrine\Migrations\Tools\Console\Command as MigrationsCommand;
use Presentation\Commands;

return [
    // Doctrine DBAL Commands
    'dbal:run-sql' => RunSqlCommand::class,

    // Doctrine ORM Commands
    'orm:clear-cache:region:collection' => ORMCommand\ClearCache\CollectionRegionCommand::class,
    'orm:clear-cache:region:entity' => ORMCommand\ClearCache\EntityRegionCommand::class,
    'orm:clear-cache:metadata' => ORMCommand\ClearCache\MetadataCommand::class,
    'orm:clear-cache:query' => ORMCommand\ClearCache\QueryCommand::class,
    'orm:clear-cache:region:query' => ORMCommand\ClearCache\QueryRegionCommand::class,
    'orm:clear-cache:result' => ORMCommand\ClearCache\ResultCommand::class,
    'orm:schema-tool:create' => ORMCommand\SchemaTool\CreateCommand::class,
    'orm:schema-tool:update' => ORMCommand\SchemaTool\UpdateCommand::class,
    'orm:schema-tool:drop' => ORMCommand\SchemaTool\DropCommand::class,
    'orm:generate-proxies' => ORMCommand\GenerateProxiesCommand::class,
    'orm:run-dql' => ORMCommand\RunDqlCommand::class,
    'orm:validate-schema' => ORMCommand\ValidateSchemaCommand::class,
    'orm:info' => ORMCommand\InfoCommand::class,
    'orm:mapping:describe' => ORMCommand\MappingDescribeCommand::class,

    // Doctrine Migrations Commands
    'migrations:current' => MigrationsCommand\CurrentCommand::class,
    'migrations:diff' => MigrationsCommand\DiffCommand::class,
    'migrations:dump-schema' => MigrationsCommand\DumpSchemaCommand::class,
    'migrations:execute' => MigrationsCommand\ExecuteCommand::class,
    'migrations:generate' => MigrationsCommand\GenerateCommand::class,
    'migrations:latest' => MigrationsCommand\LatestCommand::class,
    'migrations:list' => MigrationsCommand\ListCommand::class,
    'migrations:migrate' => MigrationsCommand\MigrateCommand::class,
    'migrations:rollup' => MigrationsCommand\RollupCommand::class,
    'migrations:status' => MigrationsCommand\StatusCommand::class,
    'migrations:sync-metadata-storage' => MigrationsCommand\SyncMetadataStorageCommand::class,
    'migrations:up-to-date' => MigrationsCommand\UpToDateCommand::class,
    'migrations:version' => MigrationsCommand\VersionCommand::class,

    // Application Commands
    'app:import:presets' => Commands\ImportPresetsCommand::class,
    'app:make:module' => Commands\MakeModuleCommand::class,
    'app:locale:extract' => Commands\ExtractLocaleMessagesCommand::class,
    'app:aws:batch' => Commands\SendBatchRequestsCommand::class,
    'app:aws:entitlement_listen' => Commands\EntitlementNotificationListenerCommand::class
];
