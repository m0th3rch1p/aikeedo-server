<?php

declare(strict_types=1);

namespace Presentation\Resources\Admin\Api;

use Presentation\Resources\Admin\Api\CategoryResource;
use JsonSerializable;
use Preset\Domain\Entities\PresetEntity;
use Presentation\Resources\DateTimeResource;

/** @package Preset\Presentation\Admin\Api\Resources */
class PresetResource implements JsonSerializable
{
    /**
     * @param PresetEntity $preset 
     * @return void 
     */
    public function __construct(
        private PresetEntity $preset
    ) {
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        $preset = $this->preset;

        $output = [
            'id' => $preset->getId(),
            'type' => $preset->getType(),
            'status' => $preset->getStatus(),
            'title' => $preset->getTitle(),
            'description' => $preset->getDescription(),
            'image' => $preset->getImage(),
            'color' => $preset->getColor(),
            'is_locked' => $preset->isLocked(),
            'created_at' => new DateTimeResource($preset->getCreatedAt()),
            'updated_at' => new DateTimeResource($preset->getUpdatedAt()),
            'category' => $preset->getCategory()
                ? new CategoryResource($preset->getCategory())
                : null,
        ];

        if (!$preset->isLocked()) {
            $output['template'] = $preset->getTemplate();
        }

        return $output;
    }
}
