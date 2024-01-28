<?php

declare(strict_types=1);

namespace Ai\Domain\Images;

class TextToImageRequest
{
    public ?string $model = null;
    public ?int $width = null;
    public ?int $height = null;
    public ?string $style = null;
    public ?string $lightning = null;
    public ?string $mood = null;

    public function __construct(
        public string $prompt,
    ) {
    }
}
