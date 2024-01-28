<?php

declare(strict_types=1);

namespace Preset\Application\CommandHandlers;

use Category\Application\Commands\ReadCategoryCommand;
use Category\Domain\Exceptions\CategoryNotFoundException;
use Preset\Application\Commands\CreatePresetCommand;
use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\LockedPresetException;
use Preset\Domain\Exceptions\TemplateExistsException;
use Preset\Domain\Services\CreatePresetService;
use Shared\Infrastructure\CommandBus\Dispatcher;
use Shared\Infrastructure\CommandBus\Exception\NoHandlerFoundException;

/** @package Preset\Application\CommandHandlers */
class CreatePresetCommandHandler
{
    /**
     * @param CreatePresetService $service 
     * @param Dispatcher $dispatcher 
     * @return void 
     */
    public function __construct(
        private CreatePresetService $service,
        private Dispatcher $dispatcher
    ) {
    }

    /**
     * @param CreatePresetCommand $cmd 
     * @return PresetEntity 
     * @throws NoHandlerFoundException 
     * @throws LockedPresetException 
     * @throws CategoryNotFoundException
     * @throws TemplateExistsException 
     */
    public function handle(CreatePresetCommand $cmd): PresetEntity
    {
        $preset = new PresetEntity($cmd->type, $cmd->title);

        if ($cmd->categoryId) {
            $command = new ReadCategoryCommand((string)$cmd->categoryId->getValue());
            $category = $this->dispatcher->dispatch($command);
            $preset->setCategory($category);
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

        if ($cmd->lock === true) {
            $preset->lock();
        }

        $this->service->createPreset($preset);
        return $preset;
    }
}
