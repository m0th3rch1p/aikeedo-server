<?php

declare(strict_types=1);

namespace Aws\Domain\Events;

use Aws\Domain\Entities\AwsEntity;

/**
 * @package Aws\Domain\Events
 */
abstract class AbstractAwsEvent
{
    /**
     * @param AwsEntity $aws
     * @return void
     */
    public function __construct(
        public readonly AwsEntity $aws,
    ) {
    }
}
