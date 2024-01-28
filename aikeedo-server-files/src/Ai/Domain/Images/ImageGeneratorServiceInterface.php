<?php

declare(strict_types=1);

namespace Ai\Domain\Images;

use Ai\Domain\Exceptions\ModelNotSupportedException;
use Ai\Domain\Services\AiServiceInterface;
use Ai\Domain\ValueObjects\Image;

interface ImageGeneratorServiceInterface extends AiServiceInterface
{
    /**
     * @param TextToImageRequest $req
     * @return Image
     * @throws ModelNotSupportedException
     */
    public function generateImage(TextToImageRequest $req): Image;
}
