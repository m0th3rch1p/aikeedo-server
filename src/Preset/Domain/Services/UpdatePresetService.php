<?php

declare(strict_types=1);

namespace Preset\Domain\Services;

use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Events\PresetUpdatedEvent;
use Preset\Domain\Exceptions\TemplateExistsException;
use Preset\Domain\Repositories\PresetRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/** @package Preset\Domain\Services */
class UpdatePresetService extends ReadPresetService
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
     * @throws TemplateExistsException 
     */
    public function updatePreset(PresetEntity $preset): void
    {
        $otherPreset = $this->repo->ofTemplate($preset->getTemplate());

        if ($otherPreset && $otherPreset->getId() !== $preset->getId()) {
            throw new TemplateExistsException($preset->getTemplate());
        }

        // Call the pre update hooks
        $preset->preUpdate();

        // Update the preset in the repository
        $this->repo->flush();

        // Dispatch the preset updated event
        $event = new PresetUpdatedEvent($preset);
        $this->dispatcher->dispatch($event);
    }
}
