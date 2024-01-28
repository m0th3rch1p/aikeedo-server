<?php

declare(strict_types=1);

namespace Presentation\Resources\Api;

use Ai\Domain\Entities\VoiceEntity;
use JsonSerializable;

class VoiceResource implements JsonSerializable
{
    public function __construct(private VoiceEntity $voice)
    {
    }

    public function jsonSerialize(): array
    {
        $e = $this->voice;

        return [
            'model' => $e->getModel(),
            'external_id' => $e->getExternalId(),
            'name' => $e->getName(),
            'sample_url' => $e->getSampleUrl(),
            'gender' => $e->getGender(),
            'accent' => $e->getAccent(),
            'tone' => $e->getTone(),
            'age' => $e->getAge(),
            'use_case' => $e->getUseCase(),
        ];
    }
}
