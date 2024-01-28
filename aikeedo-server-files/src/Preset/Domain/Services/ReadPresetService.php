<?php

declare(strict_types=1);

namespace Preset\Domain\Services;

use Preset\Domain\Entities\PresetEntity;
use Preset\Domain\Exceptions\PresetNotFoundException;
use Preset\Domain\Repositories\PresetRepositoryInterface;
use Shared\Domain\ValueObjects\Id;

/** @package Preset\Domain\Services */
class ReadPresetService
{
    /**
     * @param PresetRepositoryInterface $repo 
     * @return void 
     */
    public function __construct(
        private PresetRepositoryInterface $repo
    ) {
    }

    /**
     * @param Id $id
     * @throws PresetNotFoundException 
     */
    public function findPresetOrFail(Id $id): PresetEntity
    {
        $preset = $this->repo->ofId($id);

        if (!$preset) {
            throw new PresetNotFoundException($id);
        }

        return $preset;
    }
}
