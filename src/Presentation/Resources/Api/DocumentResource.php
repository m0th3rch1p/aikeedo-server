<?php

declare(strict_types=1);

namespace Presentation\Resources\Api;

use Document\Domain\Entities\DocumentEntity;
use JsonSerializable;
use Presentation\Resources\DateTimeResource;

/** @package Presentation\Resources\Api */
class DocumentResource implements JsonSerializable
{
    /**
     * @param DocumentEntity $document 
     * @return void 
     */
    public function __construct(
        private DocumentEntity $document
    ) {
    }

    /** @return array  */
    public function jsonSerialize(): array
    {
        $document = $this->document;

        return [
            'object' => 'document',
            'id' => $document->getId(),
            'title' => $document->getTitle(),
            'content' => $document->getContent(),
            'created_at' => new DateTimeResource($document->getCreatedAt()),
            'updated_at' => new DateTimeResource($document->getUpdatedAt()),
            'preset' => $document->getPreset()
                ? new PresetResource($document->getPreset())
                : null,
        ];
    }
}
