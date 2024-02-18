<?php

declare(strict_types=1);

namespace Ai\Domain\Services;

use Ai\Domain\Entities\VoiceEntity;
use Generator;
use Traversable;

interface TextToSpeechServiceInterface extends AiServiceInterface
{
    /** @return Traversable<int,VoiceEntity> */
    public function getVoiceList(): Traversable;

    public function create(
        string $text,
        string $voiceId,
        ?string $model = null
    ): Generator;
}
