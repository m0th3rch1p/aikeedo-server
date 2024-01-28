<?php

declare(strict_types=1);

namespace Preset\Application\CommandHandlers;

use Preset\Application\Commands\DeletePresetCommand;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Preset\Domain\Services\DeletePresetService;

/** @package Preset\Application\CommandHandlers */
class DeletePresetCommandHandler
{
    /**
     * @param DeletePresetService $service 
     * @return void 
     */
    public function __construct(
        private DeletePresetService $service
    ) {
    }

    /**
     * @param DeletePresetCommand $cmd 
     * @return void 
     * @throws PresetNotFoundException 
     */
    public function handle(DeletePresetCommand $cmd): void
    {
        $preset = $this->service->findPresetOrFail($cmd->id);
        $this->service->deletePreset($preset);
    }
}
