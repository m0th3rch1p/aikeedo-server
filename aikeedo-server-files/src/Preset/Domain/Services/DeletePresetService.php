<?php

declare(strict_types=1);

namespace Preset\Domain\Services;

use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Events\PresetDeletedEvent;
use Preset\Domain\Exceptions\LockedPresetException;
use Preset\Domain\Repositories\PresetRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/** @package Preset\Domain\Services */
class DeletePresetService extends ReadPresetService
{
    /**
     * @param PresetRepositoryInterface $repo 
     * @param EventDispatcherInterface $dispatcher 
     * @return void 
     */
    public function __construct(
        private PresetRepositoryInterface $repo,
        private EventDispatcherInterface $dispatcher
    ) {
        parent::__construct($repo);
    }

    /**
     * @param PresetEntity $preset 
     * @return void 
     */
    public function deletePreset(PresetEntity $preset): void
    {
        if ($preset->isLocked()) {
            throw new LockedPresetException();
        }

        // Delete the preset from the repository
        $this->repo
            ->remove($preset)
            ->flush();

        // Dispatch the preset deleted event
        $event = new PresetDeletedEvent($preset);
        $this->dispatcher->dispatch($event);
    }
}
