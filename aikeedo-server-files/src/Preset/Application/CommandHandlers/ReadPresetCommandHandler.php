<?php

declare(strict_types=1);

namespace Preset\Application\CommandHandlers;

use Preset\Application\Commands\ReadPresetCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Preset\Domain\Services\ReadPresetService;

/** @package Preset\Application\CommandHandlers */
class ReadPresetCommandHandler
{
    /**
     * @param ReadPresetService $service 
     * @return void 
     */
    public function __construct(
        private ReadPresetService $service
    ) {
    }

    /**
     * @param ReadPresetCommand $cmd 
     * @return PresetEntity 
     * @throws PresetNotFoundException 
     */
    public function handle(ReadPresetCommand $cmd): PresetEntity
    {
        return $this->service->findPresetOrFail($cmd->id);
    }
}
