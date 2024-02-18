<?php

declare(strict_types=1);

namespace Preset\Domain\Services;

use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Events\PresetCreatedEvent;
use Preset\Domain\Exceptions\TemplateExistsException;
use Preset\Domain\Repositories\PresetRepositoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;

/** @package Preset\Domain\Services */
class CreatePresetService
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
    }

    /**
     * @param PresetEntity $preset 
     * @return void 
     * @throws TemplateExistsException 
     */
    public function createPreset(PresetEntity $preset): void
    {
        // Check if preset with same template already exists
        if ($this->repo->ofTemplate($preset->getTemplate())) {
            throw new TemplateExistsException($preset->getTemplate());
        }

        // Add entoty to repository
        $this->repo
            ->add($preset)
            ->flush();

        // Dispatch the preset created event
        $event = new PresetCreatedEvent($preset);
        $this->dispatcher->dispatch($event);
    }
}
