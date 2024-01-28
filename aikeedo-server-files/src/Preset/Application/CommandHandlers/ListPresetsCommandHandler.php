<?php

declare(strict_types=1);

namespace Preset\Application\CommandHandlers;

use Preset\Application\Commands\ListPresetsCommand;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Preset\Domain\Repositories\PresetRepositoryInterface;
use Preset\Domain\Services\ReadPresetService;
use Shared\Domain\ValueObjects\CursorDirection;
use Traversable;

/** @package Preset\Application\CommandHandlers */
class ListPresetsCommandHandler
{
    /**
     * @param PresetRepositoryInterface $repo 
     * @param ReadPresetService $service 
     * @return void 
     */
    public function __construct(
        private PresetRepositoryInterface $repo,
        private ReadPresetService $service
    ) {
    }

    /**
     * @param ListPresetsCommand $cmd 
     * @return Traversable 
     * @throws PresetNotFoundException 
     */
    public function handle(ListPresetsCommand $cmd): Traversable
    {
        $cursor = $cmd->cursor
            ? $this->service->findPresetOrFail($cmd->cursor)
            : null;

        $presets = $this->repo
            ->sort($cmd->sortDirection, $cmd->sortParameter);

        if ($cmd->status) {
            $presets = $presets->filterByStatus($cmd->status);
        }

        if ($cmd->type) {
            $presets = $presets->filterByType($cmd->type);
        }

        if (is_bool($cmd->isLocked)) {
            $presets = $presets->filterByLock($cmd->isLocked);
        }

        if ($cmd->category) {
            $presets = $presets->filterByCategory($cmd->category);
        }

        if ($cmd->query) {
            $presets = $presets->search($cmd->query);
        }

        if ($cmd->maxResults) {
            $presets = $presets->setMaxResults($cmd->maxResults);
        }

        if ($cursor) {
            if ($cmd->cursorDirection == CursorDirection::ENDING_BEFORE) {
                return $presets = $presets->endingBefore($cursor);
            }

            return $presets->startingAfter($cursor);
        }

        return $presets;
    }
}
