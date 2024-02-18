<?php

declare(strict_types=1);

namespace Preset\Application\CommandHandlers;

use Category\Application\Commands\ReadCategoryCommand;
use Preset\Application\Commands\UpdatePresetCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Preset\Domain\Exceptions\LockedPresetException;
use Preset\Domain\Exceptions\TemplateExistsException;
use Preset\Domain\Services\UpdatePresetService;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Preset\Application\CommandHandlers */
class UpdatePresetCommandHandler
{
    /**
     * @param UpdatePresetService $service 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private UpdatePresetService $service,
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param UpdatePresetCommand $cmd 
     * @return PresetEntity 
     * @throws PresetNotFoundException 
     * @throws NoHandlerFoundException 
     * @throws LockedPresetException 
     * @throws TemplateExistsException 
     * @throws CategoryNotFoundException 
     */
    public function handle(UpdatePresetCommand $cmd): PresetEntity
    {
        $preset = $this->service->findPresetOrFail($cmd->id);

        if ($cmd->categoryId) {
            $command = new ReadCategoryCommand((string) $cmd->categoryId->getValue());
            $category = $this->dispatcher->dispatch($command);
            $preset->setCategory($category);
        } elseif ($cmd->removeCategory === true) {
            $preset->setCategory(null);
        }

        if ($cmd->title) {
            $preset->setTitle($cmd->title);
        }

        if ($cmd->description) {
            $preset->setDescription($cmd->description);
        }

        if ($cmd->status) {
            $preset->setStatus($cmd->status);
        }

        if ($cmd->template) {
            $preset->setTemplate($cmd->template);
        }

        if ($cmd->image) {
            $preset->setImage($cmd->image);
        }

        if ($cmd->color) {
            $preset->setColor($cmd->color);
        }

        $this->service->updatePreset($preset);
        return $preset;
    }
}
