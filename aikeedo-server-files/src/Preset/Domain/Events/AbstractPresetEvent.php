<?php

declare(strict_types=1);

namespace Preset\Domain\Events;

use Preset\Domain\Entities\PresetEntity;

/** @package Preset\Domain\Events */
abstract class AbstractPresetEvent
{
    /**
     * @param PresetEntity $user 
     * @return void 
     */
    public function __construct(
        public readonly PresetEntity $user
    ) {
    }
}
